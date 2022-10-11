const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const fsPromises = require('fs/promises');
const Multistream = require('multistream');

const IFFWriter = require('../../parser/IFFWriter');
const Archive = require('../../model/choops/archive/Archive');
const ChoopsTocWriter = require('../../parser/choops/ChoopsTocWriter');

const gameFileUtil = require('../../util/choops/choopsGameFileUtil');

class ChoopsArchiveWriter {
    constructor(controller) {
        this.controller = controller;
        this.cache = controller.cache;
        this.gameDirectoryPath = controller.gameDirectoryPath;
    };

    async write() {
        const creatingTocForFirstTime = this.cache.archiveCache.archives[0].sizeRaw > 0x10000;

        // check 0A file size
        if (creatingTocForFirstTime) {
            // if large
            // get list of game files
            const files = await gameFileUtil.getGameFilePaths(this.gameDirectoryPath);
            
            // bump each filename up one letter 0A -> 0B, but start from the last one to avoid name conflicts
            await Promise.all(files.reverse().map((file) => {
                return fsPromises.rename(file, file.slice(0, -1) + String.fromCharCode(file.slice(-1).charCodeAt(0) + 1));
            }));

            // update archives in cache
            let lastArchiveSize = 0;

            this.cache.archiveCache.archives.forEach((archive, index) => {
                const tempArchiveSize = archive.sizeRaw;

                if (index > 0) {
                    archive.sizeRaw = lastArchiveSize;
                }

                lastArchiveSize = tempArchiveSize;
            });

            // create 0F archive
            let fArchive = new Archive();
            fArchive.name = '\x000\x00F\x00\x00\x00\x00';
            fArchive.sizeRaw = lastArchiveSize;
            fArchive.zero = 0;
            this.cache.archiveCache.archives.push(fArchive);

            // create 0G archive
            let newArchive = new Archive();
            newArchive.name = '\x000\x00G\x00\x00\x00\x00';
            newArchive.size = 0;
            newArchive.zero = 0;
            this.cache.archiveCache.archives.push(newArchive);

            // create 0G file
            await fsPromises.writeFile(path.join(this.gameDirectoryPath, '0G'), Buffer.alloc(0));

            // update archive number += 1
            this.cache.archiveCache.numberOfArchives += 2;
        }

        // get TOC size
        const tocWriter = new ChoopsTocWriter(this.cache.archiveCache);
        const tocLength = tocWriter.calculateTOCLength();

        this.cache.archiveCache.archives[0].size = tocLength;

        if (creatingTocForFirstTime) {
            // modify each cache entry to add TOC size
            this.cache.archiveCache.toc.forEach((entry) => {
                entry.archiveIndex += 1;
                entry.offset += tocLength;
                entry.rawOffset = entry.offset / this.cache.archiveCache.alignment;
            });

            this.cache.tocCache.forEach((entry) => {
                entry.location += 1;
                
                const previousOffset = entry.rawOffset * this.cache.archiveCache.alignment;
                entry.rawOffset = (previousOffset + tocLength) / this.cache.archiveCache.alignment;

                entry.original.location = entry.location;
                entry.original.rawOffset = entry.rawOffset;
            });
        }

        // get changed entries
        const changedEntries = this.cache.tocCache.filter((entry) => {
            if (entry.original.offset !== entry.offset && entry.original.location !== entry.location) {
                return true;
            }
            if (entry.controller !== undefined && entry.controller !== null) {
                return entry.controller.file.isChanged;
            }
            else {
                return false;
            }
        });

        let addedControllers = [];

        await Promise.all(changedEntries.map(async (entry) => {
            if (!entry.controller) {
                // if the entry has changed in the past but not now, read it so we have the file
                // and we can get the IFFWriter
                await this.controller.getFileController(entry.name);
                addedControllers.push(entry.name);
            }
            else {
                // otherwise, we need to repack the controller because it has changed
                await entry.controller.repack();
            }
        }));

        // make a list of IFFWriters for each changed file, to use later
        const iffWriters = changedEntries.map((entry) => {
            return {
                entry: entry,
                writer: new IFFWriter(entry.controller.file, this.cache.archiveCache.alignment)
            }
        });

        // const changedEntryLength = iffWriters.reduce((accum, cur) => {
        //     accum += cur.lengthInArchive;
        //     return accum;
        // }, 0);

        let runningTotalOffset = this.cache.archiveCache.archives.filter((entry) => {
            return entry.name.indexOf('G') < 0;
        }).reduce((accum, cur) => {
            accum += cur.size;
            return accum;
        }, 0);

        let modFileArchive = this.cache.archiveCache.archives.find((archive) => {
            return archive.name === '\u00000\u0000G\u0000\u0000\u0000\u0000';
        });
        
        // let runningModArchiveOffset = modFileArchive.size;
        modFileArchive.size = 0;
        let runningModArchiveOffset = 0;

        // modify cache entry offset and size
        iffWriters.forEach((entry) => {
            const newEntryLength = entry.writer.lengthInArchive;

            // modify toc cache
            entry.entry.location = 6;
            entry.entry.offset = runningModArchiveOffset;
            entry.entry.rawOffset = runningTotalOffset / this.cache.archiveCache.alignment;
            entry.entry.size = newEntryLength.allDataLength;
            entry.entry.isSplit = false;
            entry.entry.splitSecondFileSize = 0;

            // modify archive cache
            let archiveCacheEntry = this.cache.archiveCache.toc.find((tocEntry) => {
                return tocEntry.id === entry.entry.id;
            });

            archiveCacheEntry.archiveIndex = 6;
            archiveCacheEntry.archiveOffset = runningModArchiveOffset;
            archiveCacheEntry.size = entry.entry.size;
            archiveCacheEntry.offset = runningTotalOffset;
            archiveCacheEntry.rawOffset = entry.entry.rawOffset;
            archiveCacheEntry.isSplit = false;
            archiveCacheEntry.splitSecondFileSize = 0;

            runningTotalOffset += newEntryLength.totalLength;
            runningModArchiveOffset += newEntryLength.totalLength;

            // update 0G cache entry
            modFileArchive.size += newEntryLength.totalLength;
        });


        // append IFF data to 0G
        const streams = new Multistream(iffWriters.map((writer) => {
            return writer.writer.createStream();
        }));

        await new Promise((resolve, reject) => {
            pipeline(
                streams,
                fs.createWriteStream(path.join(this.gameDirectoryPath, '0G'), {
                    flags: 'w+'
                }),
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            )
        });

        // write TOC to 0A
        await new Promise((resolve, reject) => {
            pipeline(
                tocWriter.createStream(),
                fs.createWriteStream(path.join(this.gameDirectoryPath, '0A')),
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            )
        });

        // clean up added controllers
        addedControllers.forEach((controllerName) => {
            let cacheEntry = this.cache.tocCache.find((entry) => {
                return entry.name === controllerName;
            });

            delete cacheEntry.controller;
        });
    };

    async revertAll() {
        try {
            await fsPromises.access(path.join(this.gameDirectoryPath, '0A'), fs.constants.R_OK | fs.constants.W_OK);
        }
        catch (err) {
            throw new Error('Cannot revert because game files are locked for writing.');
        }

        const firstArchiveStat = await fsPromises.stat(path.join(this.gameDirectoryPath, '0A'));
        
        if (firstArchiveStat.size <= 0x10000) {
            await fsPromises.rm(path.join(this.gameDirectoryPath, '0A'));
            await fsPromises.rm(path.join(this.gameDirectoryPath, '0G'));

            await fsPromises.rename(path.join(this.gameDirectoryPath, '0B'), path.join(this.gameDirectoryPath, '0A'));
            await fsPromises.rename(path.join(this.gameDirectoryPath, '0C'), path.join(this.gameDirectoryPath, '0B'));
            await fsPromises.rename(path.join(this.gameDirectoryPath, '0D'), path.join(this.gameDirectoryPath, '0C'));
            await fsPromises.rename(path.join(this.gameDirectoryPath, '0E'), path.join(this.gameDirectoryPath, '0D'));
            await fsPromises.rename(path.join(this.gameDirectoryPath, '0F'), path.join(this.gameDirectoryPath, '0E'));
        }
    };
};

module.exports = ChoopsArchiveWriter;