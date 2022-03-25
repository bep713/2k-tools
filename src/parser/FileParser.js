const stream = require('stream');
const Parser = require('stream-parser');
const ProgressTracker = require('../model/general/ProgressTracker');

class FileParser extends stream.Writable {
    constructor() {
        super();
        Parser(this);

        this._file = null;
        this._currentBufferIndex = 0;
        this._progressTracker = new ProgressTracker();
    };

    get file() {
        return this._file;
    };

    set file(file) {
        this._file = file;
    };

    get currentBufferIndex() {
        return this._currentBufferIndex;
    };

    get progressTracker() {
        return this._progressTracker;
    };

    bytes(bytesToRead, callback) {
        this._currentBufferIndex += bytesToRead;
        this._bytes(bytesToRead, callback);
    };

    skipBytes(bytesToSkip, callback) {
        this._currentBufferIndex += bytesToSkip;
        this._skipBytes(bytesToSkip, callback);
    };

    emitProgress(message) {
        this.emit('progress', this.progressTracker.format(message));
    };
};

module.exports = FileParser;