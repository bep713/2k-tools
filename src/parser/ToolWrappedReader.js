const ToolWrappedFile = require('../model/general/ToolWrappedFile');
const FileParser = require('./FileParser');

const MAGIC = 0x326B546C;

class ToolWrappedReader extends FileParser {
    constructor() {
        super();

        this.file = new ToolWrappedFile();
        this.bytes(0x8, this._onFileHeader);
    };

    _onFileHeader(buf) {
        this.file.magic = buf.readUInt32BE(0);

        if (this.file.magic !== MAGIC) {
            throw new Error('Passed in file is not 2kTool wrapped (incorrect magic check).');
        }

        this.file.headerSize = buf.readUInt32BE(4);

        this.bytes(this.file.headerSize - 0x8, this._onFileData);
    };

    _onFileData(buf) {
        this.file.fileType = buf.readUInt16BE(0);
        this.file.numberOfBlocks = buf.readUInt16BE(2);

        for (let i = 0; i < this.file.numberOfBlocks; i++) {
            this.file.blockSizes.push(buf.readUInt32BE(4 + (i * 4)));
        }

        this.bytes(this.file.blockSizes[0], this._onBlock);
    };

    _onBlock(buf) {
        this.file.blocks.push(buf);

        if (this.file.blockSizes.length > this.file.blocks.length) {
            this.bytes(this.file.blockSizes[this.file.blocks.length], this._onBlock)
        }
    };
};

module.exports = ToolWrappedReader;