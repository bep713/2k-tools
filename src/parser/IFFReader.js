const FileParser = require('./FileParser');
const IFF = require('../model/general/iff/IFF');
const IFFBlock = require('../model/general/iff/IFFBlock');
const IFFController = require('../controller/IFFController');
const IFFDataFile = require('../model/general/iff/IFFDataFile');
const IFFDataFileBlock = require('../model/general/iff/IFFDataFileBlock');

const EndianUtil = require('../util/endianUtil');
const IFFType = require('../model/general/iff/IFFType');
const h7aCompressionUtil = require('../util/h7aCompressionUtil');

class IFFReader extends FileParser {
    constructor(options) {
        super();

        this.controller = new IFFController();
        this.file = this.controller.file;
        this.hasFileNameData = false;
        this.decompressBlocks = options && options.decompressBlocks !== undefined ? options.decompressBlocks : true;
        this.endian = options && options.endian ? options.endian : EndianUtil.BIG;

        this.bytes(0x20, this._onFileHeader);
    };

    _readUInt32(buf, index) {
        if (this.endian === EndianUtil.BIG) {
            return buf.readUInt32BE(index);
        }
        else {
            return buf.readUInt32LE(index);
        }
    };

    _onFileHeader(buf) {
        this.file.magic = this._readUInt32(buf, 0);
        this.file.headerSize = this._readUInt32(buf, 4);
        this.file.fileLength = buf.readUInt32BE(8);         // File length is always BE
        this.file.zero = this._readUInt32(buf, 12);
        this.file.blockCount = this._readUInt32(buf, 16);
        this.file.unk1 = this._readUInt32(buf, 20);
        this.file.fileCount = this._readUInt32(buf, 24);
        this.file.unk2 = this._readUInt32(buf, 28);

        if (this.file.blockCount > 0) {
            this.bytes(this.file.blockCount * 0x20, this._onFileBlocks);
        }
        else {
            this.skipBytes(Infinity);
        }
    };

    _onFileBlocks(buf) {
        let currentOffset = 0;

        for (let i = 0; i < this.file.blockCount; i++) {
            let block = new IFFBlock();
            block.index = i;
            block.name = this._readUInt32(buf, currentOffset);
            block.type = this._readUInt32(buf, currentOffset + 4);
            block.unk1 = this._readUInt32(buf, currentOffset + 8);
            block.uncompressedLength = this._readUInt32(buf, currentOffset + 12);
            block.unk2 = this._readUInt32(buf, currentOffset + 16);
            block.startOffset = this._readUInt32(buf, currentOffset + 20);
            block.compressedLength = this._readUInt32(buf, currentOffset + 24);
            block.isIndexed = this._readUInt32(buf, currentOffset + 28);

            this.file.blocks.push(block);
            currentOffset += 0x20;
        }

        this.file.blocks.sort((a, b) => {
            return a.startOffset - b.startOffset;
        });

        this.bytes(this.file.fileCount * 4, function (buf) {
            this.file.dataFileOffsetBuf = buf;
            this.bytes(this.file.headerSize - this.currentBufferIndex, this._onDataHeaderBlocks);
        }.bind(this));
    };

    _onDataHeaderBlocks(buf) {
        let currentOffset = 0;

        for (let i = 0; i < this.file.fileCount; i++) {
            let file = new IFFDataFile();
            file.index = i;
            file.id = this._readUInt32(buf, currentOffset);
            file.typeRaw = this._readUInt32(buf, currentOffset + 4);
            file.offsetCount = this._readUInt32(buf, currentOffset + 8);

            for (let j = 0; j < file.offsetCount; j++) {
                let dataBlock = new IFFDataFileBlock();
                dataBlock.offset = this._readUInt32(buf, currentOffset + 12 + (j * 4));
                file.dataBlocks.push(dataBlock);
            }

            this.file.files.push(file);
            currentOffset += 12 + file.offsetCount * 4;
        }

        this.file.blocks.forEach((block, blockIndex) => {
            const filesInThisBlock = this.file.files.filter(file => {
                return file.offsetCount >= (blockIndex + 1);
            });

            filesInThisBlock.sort((a, b) => {
                return a.dataBlocks[blockIndex].offset - b.dataBlocks[blockIndex].offset;
            });

            filesInThisBlock.forEach((file, index) => {
                file.dataBlocks[blockIndex].index = index;
            });

            if (filesInThisBlock.length === 1) {
                filesInThisBlock[0].dataBlocks[blockIndex].length = block.uncompressedLength;
            }
            else {
                filesInThisBlock.forEach((file, index) => {
                    let nextOffset = block.uncompressedLength;

                    if (filesInThisBlock.length > index + 1) {
                        nextOffset = filesInThisBlock[index + 1].dataBlocks[blockIndex].offset;
                    }

                    file.dataBlocks[blockIndex].length = nextOffset - file.dataBlocks[blockIndex].offset;
                });
            }
        });

        if (this.file.blockCount > 0) {
            let bytesToSkipBeforeBlocks = this.file.blocks[0].startOffset - this.currentBufferIndex;
    
            if (bytesToSkipBeforeBlocks) {
                this.skipBytes(bytesToSkipBeforeBlocks, function () {
                    this._preBlockData(0);
                }.bind(this));
            }
            else {
                return this._preBlockData(0);
            }
        }
        else {
            this.skipBytes(Infinity);
        }
    };

    _preBlockData(blockIndex) {
        const block = this.file.blocks[blockIndex];
        let bytesToRead = block.isCompressed ? block.compressedLength : block.uncompressedLength;

        this.bytes(bytesToRead, function (buf) {
            return this._onBlockData(buf, block)
        }.bind(this));
    };

    _onBlockData(buf, block) {
        block.data = buf;

        if (block.isCompressed && this.decompressBlocks) {
            const decompressedBuf = this._decompressBlockData(buf, block);
            block.data = decompressedBuf;
        }

        block.isChanged = false;
        this.emit('block-data', block);

        if (block.index + 1 < this.file.blockCount) {
            this._preBlockData(block.index + 1);
        }
        else {
            this.bytes(0x8, this._onFileNameDefinitionHeader);
        }
    };

    _decompressBlockData(buf, block) {
        // compressed block data is always in BE
        const magic = buf.readUInt32BE(0);
        const uncompressedLength = buf.readUInt32BE(4);
        const compressedLength = buf.readUInt32BE(8);
        const unk = buf.readUInt32BE(12);
        const shiftAmount = buf.readUInt32BE(16);

        block.compressedLength = block.uncompressedLength;
        return h7aCompressionUtil.decompress(buf.slice(20), uncompressedLength, shiftAmount);
    };

    _onFileNameDefinitionHeader(buf) {
        this.hasFileNameData = true;
        const magic = this._readUInt32(buf, 0);
        const size = buf.readUInt32LE(4);

        this.file.nameDataBuf = buf;

        if (size > 0) {
            this.bytes(size, this._onFileNameDefinitions);
        }
        else {
            this._setDefaultFileNames();
            this.skipBytes(Infinity);
        }
    };

    _onFileNameDefinitions(buf) {
        this.file.nameDataBuf = Buffer.concat([this.file.nameDataBuf, buf]);

        const numNames = buf.readUInt32LE(0);
        const offsetToNames = buf.readUInt32LE(4) + 4 - 1;  // offsets are relative to their starting position - 1. So this offset is at 4 and then we subtract 1.
        let currentOffset = offsetToNames;

        for (let i = 0; i < numNames; i++) {
            const offsetToFileNames = buf.readUInt32LE(currentOffset) + currentOffset - 1;
            const offsetToName = buf.readUInt32LE(offsetToFileNames) + offsetToFileNames - 1;
            const offsetToType = buf.readUInt32LE(offsetToFileNames + 4) + offsetToFileNames + 4 - 1;

            this.file.files[i].name = buf.toString('utf16le', offsetToName, offsetToType);
            const type = buf.toString('utf16le', offsetToType, offsetToType + 10);
            this.file.files[i].type = IFFType.stringToType(type);

            this.file.files[i].name = this.file.files[i].name.slice(0, this.file.files[i].name.length - 1);

            currentOffset += 4;
        }

        // this._emitFiles();
    };

    _setDefaultFileNames() {
        this.file.files.forEach((file, index) => {
            file.name = index.toString();
        });

        // this._emitFiles();
    };

    _emitFiles() {
        this.file.files.forEach(file => {
            file.dataBlocks.forEach((dataBlock, index) => {
                dataBlock.isChanged = false;
                dataBlock.data = this.file.blocks[index].data.slice(dataBlock.offset, dataBlock.offset + dataBlock.length);
            });

            this.emit('file-data', file);
        });

        // this.skipBytes(Infinity);
    };

    _final(cb) {
        if (this.hasFileNameData) {
            this._emitFiles();
        }
        else {
            this._setDefaultFileNames();
            this._emitFiles();
        }

        cb();
    }
};

module.exports = IFFReader;