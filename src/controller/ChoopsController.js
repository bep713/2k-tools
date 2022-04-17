const fs = require('fs');
const fsPromies = require('fs/promises');
const Multistream = require('multistream');
const { EventEmitter } = require('events');
const { pipeline, Readable } = require('stream');

const cacheUtil = require('../util/cacheUtil');
const hashUtil = require('../util/2kHashUtil');
const gameFileUtil = require('../util/choops/choopsGameFileUtil');

const IFFReader = require('../parser/IFFReader');
const Archive = require('../model/choops/archive/Archive');
const ChoopsReader = require('../parser/choops/ChoopsReader');
const ChoopsCache = require('../model/choops/general/ChoopsCache');
const ProgressTracker = require('../model/general/ProgressTracker');
const ChoopsArchiveWriter = require('../parser/choops/ChoopsArchiveWriter');
const ChoopsCacheEntry = require('../model/choops/general/ChoopsCacheEntry');

class ChoopsController extends EventEmitter {
    constructor(gameDirectoryPath) {
        super();

        this.data = [];
        this.cache = null;
        this.parser = new ChoopsReader();
        this.gameDirectoryPath = gameDirectoryPath;
        this.progressTracker = new ProgressTracker();
    };

    async read(options) {
        this.progressTracker.totalSteps = 1;

        if (options && options.buildCache) {
            this._emitProgress(this.progressTracker.format('buildCache option passed in. Reading and building cache...'));

            await this._read();
            await this._buildCache();
        }
        else {
            try {
                this._emitProgress(this.progressTracker.format('Cache found, reading data from cache...'));
                this.cache = await cacheUtil.getCache(cacheUtil.CACHES.CHOOPS.cache);

                this.cache.archiveCache.archives = this.cache.archiveCache.archives.map((entry) => {
                    let archive = new Archive();
                    archive.name = entry.name;
                    archive.zero = entry.zero;
                    archive.sizeRaw = entry.sizeRaw;

                    return archive;
                });

                this.data = this.cache.tocCache;
            }
            catch (err) {
                this._emitProgress(this.progressTracker.format('Cache not found or empty, reading and building cache...'));
                await this._read();
                await this._buildCache();
            }
        }

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
                cacheEntry.name = data.meta.name;
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

        await cacheUtil.buildAndSaveCache(cacheUtil.CACHES.CHOOPS.cache, this.cache);
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
        console.log(entry);
        const resourceRawData = await this.getFileRawData(name);

        if (resourceRawData.readUInt32BE(0) === 0xFF3BEF94) {
            const resourceDataStream = Readable.from(resourceRawData);
    
            this.progressTracker.totalSteps += 1;
            this._emitProgress(this.progressTracker.format('Parsing IFF...'));
    
            let controller = await new Promise((resolve, reject) => {
                const parser = new IFFReader();
    
                pipeline(
                    resourceDataStream,
                    parser,
                    (err) => {
                        if (err) reject(err);
                        else resolve(parser.controller);
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

    async repack() {
        const archiveWriter = new ChoopsArchiveWriter(this.gameDirectoryPath, this.cache);
        await archiveWriter.write();
        await cacheUtil.buildAndSaveCache(cacheUtil.CACHES.CHOOPS.cache, this.cache);
    };

    _emitProgress(message) {
        this.emit('progress', message);
    };
};

module.exports = ChoopsController;