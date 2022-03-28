const { Readable } = require('stream');

const FileParser = require('./FileParser');
const Archive = require('../model/choops/archive/Archive');
const GameArchive = require('../model/choops/archive/GameArchive');
const ArchiveTOCEntry = require('../model/choops/archive/ArchiveTOCEntry');

class ChoopsReader extends FileParser {
    constructor(options) {
        super();

        this.archive = new GameArchive();
        this.progressTracker.totalSteps = 2;

        this.emitData = options ? options.emitData : false;
        this.stopAfterToc = options ? options.stopAfterToc : false;
        this.offsetsToExtract = options ? options.offsetsToExtract : [];

        this.bytes(0x18, this._onHeader);
    };

    _onHeader(buf) {
        this.emitProgress('Starting to read header...');

        this.archive.magic = buf.readUInt32BE(0);
        this.archive.alignment = buf.readUInt32BE(4);
        this.archive.numberOfArchives = buf.readUInt32BE(8);
        this.archive.zero = buf.readUInt32BE(12);
        this.archive.numberOfFiles = buf.readUInt32BE(16);
        this.archive.zero2 = buf.readUInt32BE(20);

        this.bytes(this.archive.numberOfArchives * 0x10, this._onFileHeaders);
    };

    _onFileHeaders(buf) {
        this.progressTracker.step();
        this.emitProgress('Reading file headers.');

        let currentOffset = 0;

        for (let i = 0; i < this.archive.numberOfArchives; i++) {
            const archive = new Archive();
            archive.sizeRaw = buf.readUInt32BE(currentOffset);
            archive.zero = buf.readUInt32BE(currentOffset + 4);
            archive.name = buf.toString('utf8', currentOffset + 8, currentOffset + 16);
            
            this.archive.archives.push(archive);
            currentOffset += 16;
        }

        this.bytes(this.archive.numberOfFiles * 0x10, this._onToc);
    };

    _onToc(buf) {
        this.progressTracker.step();
        this.emitProgress('Reading file table.');

        let currentOffset = 0;

        for (let i = 0; i < this.archive.numberOfFiles; i++) {
            const tocEntry = new ArchiveTOCEntry();
            tocEntry.id = i;
            tocEntry.unk = buf.readUInt32BE(currentOffset);
            tocEntry.rawOffset = buf.readUInt32BE(currentOffset + 4);
            tocEntry.offset = tocEntry.rawOffset * this.archive.alignment;
            tocEntry.zero = buf.readUInt32BE(currentOffset + 8);
            tocEntry.size = buf.readUInt32BE(currentOffset + 12);

            const archiveDetails = this._getArchiveDetailsFromOffset(tocEntry.offset);
            tocEntry.archiveIndex = archiveDetails.index;
            tocEntry.archiveOffset = archiveDetails.offset;

            this.archive.toc.push(tocEntry);
            currentOffset += 16;
        }

        this.archive.toc.sort((a, b) => {
            return a.offset - b.offset;
        });

        if (this.offsetsToExtract && this.offsetsToExtract.length > 0) {
            this.archive.toc = this.archive.toc.filter(function (toc) {
                return this.offsetsToExtract.indexOf(toc.offset) >= 0;
            }.bind(this));
        }

        if (this.stopAfterToc || this.archive.toc.length === 0) {
            this.skipBytes(Infinity);
        }
        else {
            this.progressTracker.reset();
            this.progressTracker.totalSteps = this.archive.toc.length;
            this.emitProgress('Starting to read data...');

            this._skipToChunkAtIndex(0);
        }
    };

    _onChunk(buf, index) {
        const toc = this.archive.toc[index];

        this.progressTracker.step();
        this.emitProgress(`Reading data chunk: File #${toc.archiveIndex}, Offset: 0x${toc.archiveOffset.toString(16)}`);

        let chunkDetails = {
            meta: this.archive.toc[index]
        };

        if (this.emitData) {
            chunkDetails.data = Readable.from(buf)
        }

        this.emit('chunk', chunkDetails);

        if ((index + 1) < this.archive.toc.length) {
            this._skipToChunkAtIndex(index + 1);
        }
        else {
            this.skipBytes(Infinity);
        }
    };

    _getArchiveDetailsFromOffset(offset) {
        let runningOffset = 0;
        let archiveFileIndex = 0;
        let archiveOffset = 0;

        for (let i = 0; i < this.archive.archives.length; i++) {
            runningOffset += this.archive.archives[i].size;

            if (offset < runningOffset) {
                archiveFileIndex = i;
                archiveOffset = offset - (runningOffset - this.archive.archives[i].size);
                break;
            }
        }

        return {
            index: archiveFileIndex,
            offset: archiveOffset
        };
    };

    _skipToChunkAtIndex(index) {
        const bytesToSkip = (this.archive.toc[index].rawOffset * this.archive.alignment) - this.currentBufferIndex;

        if (bytesToSkip > 0) {
            this.skipBytes(bytesToSkip, function () {
                this._readChunk(index);
            });
        }
        else {
            this._readChunk(index);
        }
    };

    _readChunk(index) {
        this.bytes(this.archive.toc[index].size, function (buf) {
            return this._onChunk(buf, index);
        });
    }
};

module.exports = ChoopsReader;