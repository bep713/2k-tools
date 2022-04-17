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
    constructor(gameDirectoryPath, cache) {
        this.cache = cache;
        this.gameDirectoryPath = gameDirectoryPath;
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
                // entry.offset += tocLength;
                entry.rawOffset = entry.offset / this.cache.archiveCache.alignment;
            });
        }

        // get changed entries
        const changedEntries = this.cache.tocCache.filter((entry) => {
            if (entry.controller !== undefined && entry.controller !== null) {
                return entry.controller.file.isChanged;
            }
            else {
                return false;
            }
        });

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

        let runningTotalOffset = this.cache.archiveCache.archives.reduce((accum, cur) => {
            accum += cur.size;
            return accum;
        }, 0);

        const modFileArchive = this.cache.archiveCache.archives.find((archive) => {
            return archive.name === '\u00000\u0000G\u0000\u0000\u0000\u0000';
        });

        let runningModArchiveOffset = modFileArchive.size;

        // modify cache entry offset and size
        iffWriters.forEach((entry) => {
            const newEntryLength = entry.writer.lengthInArchive;

            // modify toc cache
            entry.entry.location = 6;
            entry.entry.offset = runningModArchiveOffset;
            entry.entry.rawOffset = runningTotalOffset / this.cache.archiveCache.alignment;
            entry.entry.size = newEntryLength.allDataLength;

            // modify archive cache
            let archiveCacheEntry = this.cache.archiveCache.toc.find((tocEntry) => {
                return tocEntry.id === entry.entry.id;
            });

            archiveCacheEntry.archiveIndex = 6;
            archiveCacheEntry.archiveOffset = runningModArchiveOffset;
            archiveCacheEntry.size = entry.entry.size;
            archiveCacheEntry.offset = runningTotalOffset;
            archiveCacheEntry.rawOffset = entry.entry.rawOffset;

            runningTotalOffset += newEntryLength.totalLength;
            runningModArchiveOffset += newEntryLength.totalLength;
        });


        // append IFF data to 0G
        const streams = new Multistream(iffWriters.map((writer) => {
            return writer.writer.createStream();
        }));

        await new Promise((resolve, reject) => {
            pipeline(
                streams,
                fs.createWriteStream(path.join(this.gameDirectoryPath, '0G'), {
                    flags: 'a+'
                }),
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            )
        });

        // update 0G cache entry
        modFileArchive.size += runningModArchiveOffset;

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
    };
};

module.exports = ChoopsArchiveWriter;