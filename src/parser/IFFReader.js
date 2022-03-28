const { Readable } = require('stream');

const FileParser = require('./FileParser');
const IFF = require('../model/choops/iff/IFF');
const IFFBlock = require('../model/choops/iff/IFFBlock');

class IFFReader extends FileParser {
    constructor() {
        super();

        this.file = new IFF();

        this.bytes(0x20, this._onFileHeader);
    };

    _onFileHeader(buf) {
        this.file.magic = buf.readUInt32BE(0);
        this.file.headerSize = buf.readUInt32BE(4);
        this.file.fileLength = buf.readUInt32BE(8);
        this.file.zero = buf.readUInt32BE(12);
        this.file.blockCount = buf.readUInt32BE(16);
        this.file.unk1 = buf.readUInt32BE(20);
        this.file.fileCount = buf.readUInt32BE(24);
        this.file.unk2 = buf.readUInt32BE(28);

        this.bytes(this.file.blockCount * 0x20, this._onFileBlocks);
    };

    _onFileBlocks(buf) {
        let currentOffset = 0;

        for (let i = 0; i < this.file.blockCount; i++) {
            let block = new IFFBlock();
            block.name = buf.readUInt32BE(0);
            block.type = buf.readUInt32BE(4);
            block.unk1 = buf.readUInt32BE(8);
            block.uncompressedLength = buf.readUInt32BE(12);
            block.unk2 = buf.readUInt32BE(16);
            block.startOffset = buf.readUInt32BE(20);
            block.compressedLength = buf.readUInt32BE(24);
            block.isIndexed = buf.readUInt32BE(28);

            this.file.blocks.push(block);
            currentOffset += 0x20;
        }

        this.skipBytes(Infinity);
    };
};

module.exports = IFFReader;