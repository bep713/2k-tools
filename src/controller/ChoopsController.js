const fs = require('fs');
const path = require('path');
const fsPromies = require('fs/promises');
const Multistream = require('multistream');
const { EventEmitter } = require('events');
const { pipeline, Readable } = require('stream');

const cacheUtil = require('../util/cacheUtil');
const hashUtil = require('../util/2kHashUtil');
const bigIntUtil = require('../util/bigIntUtil');
const gameFileUtil = require('../util/choops/choopsGameFileUtil');

const IFFReader = require('../parser/IFFReader');
const IFFType = require('../model/general/iff/IFFType');
const Archive = require('../model/choops/archive/Archive');
const ChoopsReader = require('../parser/choops/ChoopsReader');
const ChoopsCache = require('../model/choops/general/ChoopsCache');
const ProgressTracker = require('../model/general/ProgressTracker');
const ChoopsArchiveWriter = require('../parser/choops/ChoopsArchiveWriter');
const ChoopsCacheEntry = require('../model/choops/general/ChoopsCacheEntry');

class ChoopsController extends EventEmitter {
    constructor(gameDirectoryPath, gameName) {
        super();

        this.data = [];
        this.cache = null;
        this.gameName = gameName;
        
        this.parser = new ChoopsReader({
            gameName: this.gameName
        });

        this.gameDirectoryPath = gameDirectoryPath;
        this.progressTracker = new ProgressTracker();
        this._archiveWriter = new ChoopsArchiveWriter(this);
    };

    async read(options) {
        this.progressTracker.totalSteps = 1;

        if (options && options.buildCache) {
            this._emitProgress(this.progressTracker.format('buildCache option passed in. Reading and building cache...'));
            await this.rebuildCache();
        }
        else {
            try {
                this._emitProgress(this.progressTracker.format('Cache found, reading data from cache...'));
                this.cache = await cacheUtil.getCache(cacheUtil.getFormattedCacheName(this.gameName));

                this.cache.archiveCache.archives = this.cache.archiveCache.archives.map((entry) => {
                    let archive = new Archive();
                    archive.name = entry.name;
                    archive.zero = entry.zero;
                    archive.zero = entry.zero;
                    archive.sizeRaw = BigInt(entry.sizeRaw);

                    return archive;
                });

                this.cache.tocCache = this.cache.tocCache.map((rawCacheEntry) => {
                    let cacheEntry = new ChoopsCacheEntry();
                    cacheEntry.id = rawCacheEntry.id;
                    cacheEntry.size = rawCacheEntry.size;
                    cacheEntry.nameHash = rawCacheEntry.nameHash;
                    cacheEntry.name = rawCacheEntry.name;
                    cacheEntry.rawOffset = rawCacheEntry.rawOffset;
                    cacheEntry.offset = rawCacheEntry.offset;
                    cacheEntry.location = rawCacheEntry.location;
                    cacheEntry.isSplit = rawCacheEntry.isSplit;
                    cacheEntry.splitSecondFileSize = rawCacheEntry.splitSecondFileSize;
                    
                    cacheEntry.original.id = rawCacheEntry.original.id;
                    cacheEntry.original.size = rawCacheEntry.original.size;
                    cacheEntry.original.nameHash = rawCacheEntry.original.nameHash;
                    cacheEntry.original.name = rawCacheEntry.original.name;
                    cacheEntry.original.rawOffset = rawCacheEntry.original.rawOffset;
                    cacheEntry.original.offset = rawCacheEntry.original.offset;
                    cacheEntry.original.location = rawCacheEntry.original.location;
                    cacheEntry.original.isSplit = rawCacheEntry.original.isSplit;
                    cacheEntry.original.splitSecondFileSize = rawCacheEntry.original.splitSecondFileSize;

                    return cacheEntry;
                });

                this.data = this.cache.tocCache;
            }
            catch (err) {
                this._emitProgress(this.progressTracker.format('Cache not found or empty, reading and building cache...'));
                await this.rebuildCache();
            }
        }

        this._archiveWriter.cache = this.cache;

        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format('Read complete.'));
    };

    async _read() {
        await hashUtil.hashLookupPromise;

        let cachePromises = [];

        this.parser.on('progress', function (data) {
            this._emitProgress(data);
        }.bind(this));

        this.parser.on('chunk', async function (data) {
            cachePromises.push(new Promise(async (resolve, reject) => {
                let cacheEntry = new ChoopsCacheEntry();
                cacheEntry.id = data.meta.id;
                cacheEntry.size = data.meta.size;
                cacheEntry.nameHash = data.meta.nameHash;

                const name = await hashUtil.hashLookup(cacheEntry.nameHash);
                if (!name) {
                    cacheEntry.name = data.meta.id.toString();
                }
                else {
                    cacheEntry.name = name.str;
                }

                cacheEntry.rawOffset = data.meta.rawOffset;
                cacheEntry.offset = data.meta.archiveOffset;
                cacheEntry.location = data.meta.archiveIndex;
                cacheEntry.isSplit = data.meta.isSplit;
                cacheEntry.splitSecondFileSize = data.meta.splitSecondFileSize;
    
                cacheEntry.setCurrentDataAsOriginal();
                resolve(cacheEntry);
            }));
        }.bind(this));

        const gameFilePaths = await gameFileUtil.getGameFilePaths(this.gameDirectoryPath);
        const gameReadStreams = gameFilePaths.map((gameFilePath) => {
            return fs.createReadStream(gameFilePath);
        });

        await new Promise((resolve, reject) => {
            pipeline(
                new Multistream(gameReadStreams),
                this.parser,
                (err) => {
                    if (err) { reject(err); }
                    else { resolve(); }
                }
            );
        });

        const cacheEntries = await Promise.all(cachePromises);
        this.data = cacheEntries;
    };

    async _buildCache() {
        this.cache = new ChoopsCache();
        this.cache.tocCache = this.data;
        this.cache.archiveCache = this.parser.archive;

        await this._saveCache();
    };

    async rebuildCache() {
        await this._read();
        await this._buildCache();
    };

    async _saveCache() {
        // build cache to save - we don't want to save any of the controllers
        let cacheToSave = JSON.parse(JSON.stringify(this.cache));

        cacheToSave.tocCache.forEach((cacheEntry) => {
            delete cacheEntry.controller;
        });

        await cacheUtil.buildAndSaveCache(cacheUtil.getFormattedCacheName(this.gameName), cacheToSave);
    };

    getEntryByName(name) {
        const entry = this.data.find((entry) => {
            return entry.name.toLowerCase() === name.toLowerCase();
        });

        if (!entry) {
            throw new Error(`Cannot find a resource in the cache with name ${name}.`);
        }

        return entry;
    };

    // retrieve the raw buffer of a resource.
    async getFileRawData(name) {
        if (!name) { throw new Error('getResourceData() takes in a mandatory `name` parameter.'); }
        if (!this.data) { throw new Error('No data loaded. You must call the `read` function before calling this function.'); }

        this.progressTracker.reset();
        this.progressTracker.totalSteps = 2;
        this._emitProgress(this.progressTracker.format('Searching for entry in cache...'));

        const entry = this.getEntryByName(name);
        
        let entryBuf = Buffer.alloc(entry.size);
        const entryPath = await gameFileUtil.getGameFilePathByIndex(this.gameDirectoryPath, entry.location);

        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format(`Reading resource from path: ${entryPath} @ offset 0x${entry.offset.toString(16)}.`));

        await this._openAndReadFile(entryPath, entryBuf, entry.size, entry.offset);

        if (entry.isSplit) {
            let entryBuf2 = Buffer.alloc(entry.splitSecondFileSize);
            const entryPath2 = await gameFileUtil.getGameFilePathByIndex(this.gameDirectoryPath, entry.location + 1);

            this.progressTracker.totalSteps += 1;
            this.progressTracker.step();
            this._emitProgress(this.progressTracker.format(`Data is split between two files. Continuing to read from path: ${entryPath2} @ offset 0x0.`));

            await this._openAndReadFile(entryPath2, entryBuf2, entry.splitSecondFileSize, 0);

            entryBuf = entryBuf.slice(0, entry.size - entry.splitSecondFileSize);
            entryBuf = Buffer.concat([entryBuf, entryBuf2]);
        }

        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format('Done reading resource.'));

        return entryBuf;
    };

    async _openAndReadFile(path, buf, length, offset) {
        const fd = await fsPromies.open(path, 'r+');

        await fd.read({
            buffer: buf,
            offset: 0,
            length: length,
            position: offset
        });

        await fd.close();
    };

    async getFileController(name) {
        let entry = this.getEntryByName(name);
        if (entry.controller) { return entry.controller; }
        
        const resourceRawData = await this.getFileRawData(name);
        if (resourceRawData.readUInt32BE(0) === 0xFF3BEF94) {
            const resourceDataStream = Readable.from(resourceRawData);
    
            this.progressTracker.totalSteps += 1;
            this._emitProgress(this.progressTracker.format('Parsing IFF...'));
    
            let controller = await new Promise((resolve, reject) => {
                const parser = new IFFReader();
                let pendingFilePromises = [];

                parser.on('file-data', (file) => {
                    pendingFilePromises.push((async () => {
                        if (file.type === IFFType.TYPES.UNKNOWN && file.typeRaw) {
                            // if the file doesn't have the name definition, try to find and set the
                            // file type here based on the type hash in the IFF header.
                            const type = await hashUtil.hashLookup(file.typeRaw);
                            
                            if (type) {
                                file.type = IFFType.stringToType(type.str);
                            }
                        }
                    })());
                });
    
                pipeline(
                    resourceDataStream,
                    parser,
                    async (err) => {
                        if (err) reject(err);
                        else {
                            await Promise.all(pendingFilePromises);
                            resolve(parser.controller);
                        }
                    }
                )
            });
    
            entry.controller = controller;
            
            this.progressTracker.step();
            this._emitProgress(this.progressTracker.format('Done parsing IFF.'));
            return controller;
        }
        else {
            return resourceRawData;
        }
    };

    async repack(saveCache) {
        await this._archiveWriter.write();

        if (saveCache === undefined || saveCache === true) {
            await this._saveCache();
        }
    };

    async revert(name) {
        let entry = this.getEntryByName(name);
        entry.revert();

        // need logic to bump the location by 1 if the files are still modified
        // if (this.cache.archiveCache.archives.length > 5) {
        //     entry.location += 1;
        //     entry.offset 
        // }

        let archiveCacheEntry = this.cache.archiveCache.toc.find((tocEntry) => {
            return tocEntry.id === entry.id;
        });

        archiveCacheEntry.archiveIndex = entry.location;
        archiveCacheEntry.archiveOffset = entry.offset;
        archiveCacheEntry.rawOffset = entry.rawOffset;
        archiveCacheEntry.size = entry.size;
        archiveCacheEntry.isSplit = entry.isSplit;
        archiveCacheEntry.splitSecondFileSize = entry.splitSecondFileSize;

        delete entry.controller; 
    };

    async revertAll() {
        try {
            const reverted = await this._archiveWriter.revertAll();
            
            // replace cache with default
            this.cache = await cacheUtil.getCache(cacheUtil.CACHES.CHOOPS.cache, path.join(__dirname, '../data/choops/ch2k8_default.cache'));
            await this._saveCache();
        }
        catch (err) {
            throw err;
        }
    };

    _emitProgress(message) {
        this.emit('progress', message);
    };
};

module.exports = ChoopsController;