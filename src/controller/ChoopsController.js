const fs = require('fs');
const fsPromies = require('fs/promises');
const { pipeline } = require('stream');
const Multistream = require('multistream');
const { EventEmitter } = require('events');

const cacheUtil = require('../util/cacheUtil');
const gameFileUtil = require('../util/choops/choopsGameFileUtil');

const ChoopsReader = require('../parser/ChoopsReader');
const ChoopsCacheEntry = require('../model/choops/ChoopsCacheEntry');
const ProgressTracker = require('../model/general/ProgressTracker');

class ChoopsController extends EventEmitter {
    constructor(gameDirectoryPath) {
        super();

        this.data = [];
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
                this.data = await cacheUtil.getCache(cacheUtil.CACHES.CHOOPS.cache);
            }
            catch (err) {
                this._emitProgress(this.progressTracker.format('Cache not found or empty, reading and building cache...'));
                await this._read();
            }
        }

        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format('Read complete.'));
    };

    async _read() {
        this.parser.on('progress', function (data) {
            this._emitProgress(data);
        }.bind(this));

        this.parser.on('chunk', function (data) {
            let cacheEntry = new ChoopsCacheEntry();
            cacheEntry.id = data.meta.id;
            cacheEntry.size = data.meta.size;
            cacheEntry.unknown = data.meta.unk;
            cacheEntry.name = data.meta.id.toString();
            cacheEntry.rawOffset = data.meta.rawOffset;
            cacheEntry.offset = data.meta.archiveOffset;
            cacheEntry.location = data.meta.archiveIndex;

            cacheEntry.setCurrentDataAsOriginal();

            this.data.push(cacheEntry);
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
    };

    async _buildCache() {
        await cacheUtil.buildAndSaveCache(cacheUtil.CACHES.CHOOPS.cache, this.data);
    };

    // retrieve the raw buffer of a resource.
    async getResourceData(name) {
        if (!name) { throw new Error('getResource() takes in a mandatory `name` parameter.'); }
        if (!this.data) { throw new Error('No data loaded. You must call the `read` function before calling this function.'); }

        this.progressTracker.reset();
        this.progressTracker.totalSteps = 2;
        this._emitProgress(this.progressTracker.format('Searching for entry in cache...'));

        const entry = this.data.find((entry) => {
            return entry.name.toLowerCase() === name.toLowerCase();
        });

        if (!entry) {
            throw new Error(`Cannot find a resource in the cache with name ${name}.`);
        }
        
        let entryBuf = Buffer.alloc(entry.size);
        const entryPath = await gameFileUtil.getGameFilePathByIndex(this.gameDirectoryPath, entry.location);
        
        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format(`Reading resource from path: ${entryPath} @ offset 0x${entry.offset.toString(16)}.`));
        
        const fd = await fsPromies.open(entryPath, 'r+');
        await fd.read({
            buffer: entryBuf,
            offset: 0,
            length: entry.size,
            position: entry.offset
        });

        this.progressTracker.step();
        this._emitProgress(this.progressTracker.format('Done reading resource.'));

        return entryBuf;
    };

    _emitProgress(message) {
        this.emit('progress', message);
    };
};

module.exports = ChoopsController;