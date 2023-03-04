const path = require('path');
const util = require('util');
const fs = require('graceful-fs');
const { pipeline, Readable } = require('stream');
const Chunker = require('stream-chunker');
const Multistream = require('multistream');
const Writable = require('stream').Writable;

const IFFWriter = require('../../parser/IFFWriter');
const Archive = require('../../model/choops/archive/Archive');
const ChoopsTocWriter = require('../../parser/choops/ChoopsTocWriter');

const gameFileUtil = require('../../util/choops/choopsGameFileUtil');

const rm = util.promisify(fs.rm);
const stat = util.promisify(fs.stat);
const access = util.promisify(fs.access);
const rename = util.promisify(fs.rename);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

const MAX_DATAFILE_CHUNK_SIZE = 0x40000000;

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
            for (const file of files.reverse()) {
                await rename(file, file.slice(0, -1) + String.fromCharCode(file.slice(-1).charCodeAt(0) + 1));
            }

            // update archives in cache
            let lastArchiveSize = 0n;

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
            fArchive.sizeRaw = BigInt(lastArchiveSize);
            fArchive.zero = 0;
            this.cache.archiveCache.archives.push(fArchive);
            this.cache.archiveCache.numberOfArchives += 1;

            await this._createAndSaveNewArchiveFile('0G');
        }

        // get TOC size
        const tocWriter = new ChoopsTocWriter(this.cache.archiveCache);
        const tocLength = tocWriter.calculateTOCLength();

        this.cache.archiveCache.archives[0].size = BigInt(tocLength);

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

        // start with 0G
        let dataFileLetter = 'G';
        let currentLocation = 6;

        let runningTotalOffset = this.cache.archiveCache.archives.filter((entry) => {
            return entry.name.indexOf(dataFileLetter) < 0;
        }).reduce((accum, cur) => {
            accum += BigInt(cur.size);
            return accum;
        }, 0n);

        let modFileArchive = this.cache.archiveCache.archives.find((archive) => {
            return archive.name === `\u00000\u0000${dataFileLetter}\u0000\u0000\u0000\u0000`;
        });
        
        // let runningModArchiveOffset = modFileArchive.size;
        modFileArchive.size = 0n;
        let runningModArchiveOffset = 0;

        // modify cache entry offset and size
        for(const entry of iffWriters) {
            const newEntryLength = entry.writer.lengthInArchive;
            let newModFileArchiveSize = modFileArchive.size + BigInt(newEntryLength.totalLength);

            // modify toc cache
            entry.entry.location = currentLocation;
            entry.entry.offset = runningModArchiveOffset;
            entry.entry.rawOffset = Number(runningTotalOffset / BigInt(this.cache.archiveCache.alignment));
            entry.entry.size = newEntryLength.allDataLength;

            // if the entry is determined to be split, calculate the second file size
            entry.entry.isSplit = newModFileArchiveSize > MAX_DATAFILE_CHUNK_SIZE;
            entry.entry.splitSecondFileSize = entry.entry.isSplit ? (newModFileArchiveSize - BigInt(MAX_DATAFILE_CHUNK_SIZE)) : 0;

            // modify archive cache
            let archiveCacheEntry = this.cache.archiveCache.toc.find((tocEntry) => {
                return tocEntry.id === entry.entry.id;
            });

            archiveCacheEntry.archiveIndex = currentLocation;
            archiveCacheEntry.archiveOffset = runningModArchiveOffset;
            archiveCacheEntry.size = entry.entry.size;
            archiveCacheEntry.offset = runningTotalOffset;
            archiveCacheEntry.rawOffset = entry.entry.rawOffset;
            archiveCacheEntry.isSplit = entry.entry.isSplit;
            archiveCacheEntry.splitSecondFileSize = entry.entry.splitSecondFileSize;

            runningTotalOffset += BigInt(newEntryLength.totalLength);
            runningModArchiveOffset += newEntryLength.totalLength;

            // update cache entry
            if (entry.entry.isSplit) {
                modFileArchive.size = BigInt(MAX_DATAFILE_CHUNK_SIZE);

                dataFileLetter = String.fromCharCode(dataFileLetter.charCodeAt(0) + 1);
                currentLocation += 1;

                await this._createAndSaveNewArchiveFile(`0${dataFileLetter}`)

                modFileArchive = this.cache.archiveCache.archives.find((archive) => {
                    return archive.name === `\u00000\u0000${dataFileLetter}\u0000\u0000\u0000\u0000`;
                });

                modFileArchive.size = entry.entry.splitSecondFileSize;
            }
            else {
                modFileArchive.size += BigInt(newEntryLength.totalLength);
            }
        };


        // append IFF data to 0G
        const streams = new Multistream(iffWriters.map((writer) => {
            return writer.writer.createStream();
        }));

        // chunk data files to 1GB each
        let chunker = new Chunker(MAX_DATAFILE_CHUNK_SIZE, {
            flush: true
        });

        // start with F because it'll increment 1 on the first run and switch to 0G.
        dataFileLetter = 'F';
        let outputStream;

        chunker.on('data', (data) => {
            dataFileLetter = String.fromCharCode(dataFileLetter.charCodeAt(0) + 1);
            let dataFileName = `0${dataFileLetter}`;

            outputStream = fs.createWriteStream(path.join(this.gameDirectoryPath, `${dataFileName}`), {
                flags: 'w+'
            });

            pipeline(
                Readable.from(data),
                outputStream,
                (err) => {
                    if (err) {
                        console.log(err);
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            pipeline(
                streams,
                chunker,
                // outputStream,
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
            await access(path.join(this.gameDirectoryPath, '0A'), fs.constants.R_OK | fs.constants.W_OK);
        }
        catch (err) {
            throw err;
        }
        
        const firstArchiveStat = await stat(path.join(this.gameDirectoryPath, '0A'));
        
        if (firstArchiveStat.size <= 0x10000) {
            const dirs = await readdir(this.gameDirectoryPath);
            const dirsToRemove = dirs.filter((dir) => {
                return (dir[0] === '0' 
                    && (dir[1] === 'A') || dir[1] >= 'G');
            });

            for (const dir of dirsToRemove) {
                await rm(path.join(this.gameDirectoryPath, dir));
            }

            await rename(path.join(this.gameDirectoryPath, '0B'), path.join(this.gameDirectoryPath, '0A'));
            await rename(path.join(this.gameDirectoryPath, '0C'), path.join(this.gameDirectoryPath, '0B'));
            await rename(path.join(this.gameDirectoryPath, '0D'), path.join(this.gameDirectoryPath, '0C'));
            await rename(path.join(this.gameDirectoryPath, '0E'), path.join(this.gameDirectoryPath, '0D'));
            await rename(path.join(this.gameDirectoryPath, '0F'), path.join(this.gameDirectoryPath, '0E'));
        }
    };

    async _createAndSaveNewArchiveFile(name) {
        let unicodeName = name.split('').map((char) => {
            return '\x00' + char;
        }).join('');

        unicodeName += '\x00\x00\x00\x00';

        // create archive
        let newArchive = new Archive();
        newArchive.name = unicodeName;
        newArchive.size = 0n;
        newArchive.zero = 0;
        this.cache.archiveCache.archives.push(newArchive);
        this.cache.archiveCache.numberOfArchives += 1;

        // create the file
        await writeFile(path.join(this.gameDirectoryPath, name), Buffer.alloc(0));
    };
};

module.exports = ChoopsArchiveWriter;