const util = require('util');
const path = require('path');
const fs = require('graceful-fs');
const { Writable } = require('stream');

const open = util.promisify(fs.open);
const write = util.promisify(fs.write);

class SplitWriter extends Writable {
    constructor(opts) {
        /* OPTIONS
            cwd: filepath without the filename
            firstFileName: name of the first file
            fileNameFn: function that determines the next file name
                arg1: name of the previous file
            chunkSize: maximum size of each file, in bytes
        */

        super();
        this.opts = opts;

        this.filePaths = [];
        this.currentFd = null;
        this.currentFileSize = 0;
        this.currentFileName = '';
    };

    async _construct(cb) {
        await this._openOutputFile(path.join(this.opts.cwd, this.opts.firstFileName));
        cb();
    };

    async _write(chunk, enc, cb) {
        if (this.currentFileSize + chunk.length > this.opts.chunkSize) {
            const firstChunkSize = this.opts.chunkSize - this.currentFileSize;
            await write(this.currentFd, chunk.slice(0, firstChunkSize));

            await this._openNextOutputFile();
            await write(this.currentFd, chunk.slice(firstChunkSize));
            this.currentFileSize = chunk.length - firstChunkSize;
        }
        else {
            await write(this.currentFd, chunk);
            this.currentFileSize += chunk.length;
        }

        cb();
    };

    async _openNextOutputFile() {
        let nextFileName = this.filePaths.length + 1;

        if(this.opts.fileNameFn) {
            nextFileName = this.opts.fileNameFn(this.currentFileName);
        }

        await this._openOutputFile(path.join(this.opts.cwd, nextFileName));
    };

    async _openOutputFile(filePath) {
        this.currentFd = await open(filePath, 'w+');
        this.currentFileName = filePath;
        this.currentFileSize = 0;
        this.filePaths.push(filePath);
    };
};

module.exports = SplitWriter;