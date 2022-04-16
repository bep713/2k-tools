const { Readable } = require('stream');

class IFFWriter {
    constructor(file) {
        this.file = file;

        if (file) {
            this.file.updateBlockDataAndOffsets();
        }
    };

    get lengthInArchive() {
        const totalBlockLength = this.file.blocks.reduce((accum, cur) => {
            accum += cur.data.length;
            return accum;
        }, 0);

        return this.file.headerSize + totalBlockLength + this.file.nameDataBuf.length;
    };

    createStream() {
        return new IFFWriterReadable(this.file);
    };
};

module.exports = IFFWriter;

class IFFWriterReadable extends Readable {
    constructor(file) {
        super();
        this.file = file;

        let headerBuffer = Buffer.alloc(file.headerSize);

        // File header
        headerBuffer.writeUInt32BE(file.magic, 0x0);
        headerBuffer.writeUInt32BE(file.headerSize, 0x4);
        headerBuffer.writeUInt32BE(file.fileLength, 0x8);
        headerBuffer.writeUInt32BE(file.zero, 0xC);
        headerBuffer.writeUInt32BE(file.blockCount, 0x10);
        headerBuffer.writeUInt32BE(file.unk1, 0x14);
        headerBuffer.writeUInt32BE(file.fileCount, 0x18);
        headerBuffer.writeUInt32BE(file.unk2, 0x1C);

        let currentIndex = 0x20;

        // Blocks
        this.file.blocks.forEach((block) => {
            headerBuffer.writeUInt32BE(block.name, currentIndex);
            headerBuffer.writeUInt32BE(block.type, currentIndex + 0x4);
            headerBuffer.writeUInt32BE(block.unk1, currentIndex + 0x8);
            headerBuffer.writeUInt32BE(block.uncompressedLength, currentIndex + 0xC);
            headerBuffer.writeUInt32BE(block.unk2, currentIndex + 0x10);
            headerBuffer.writeUInt32BE(block.startOffset, currentIndex + 0x14);
            headerBuffer.writeUInt32BE(block.compressedLength, currentIndex + 0x18);
            headerBuffer.writeUInt32BE(block.isIndexed, currentIndex + 0x1C);

            currentIndex += 0x20;
        });

        // Data file header offsets
        headerBuffer.fill(file.dataFileOffsetBuf, currentIndex);
        currentIndex += file.dataFileOffsetBuf.length;

        // Data file headers
        this.file.files.forEach((file) => {
            headerBuffer.writeUInt32BE(file.id, currentIndex);
            headerBuffer.writeUInt32BE(file.typeRaw, currentIndex + 0x4);
            headerBuffer.writeUInt32BE(file.offsetCount, currentIndex + 0x8);

            currentIndex += 0xC;
            
            file.dataBlocks.forEach((dataBlock) => {
                headerBuffer.writeUInt32BE(dataBlock.offset, currentIndex);
                currentIndex += 4;
            });
        });

        this.push(headerBuffer);

        this.file.blocks.forEach((block) => {
            this.push(block.data);
        });

        this.push(this.file.nameDataBuf);

        this.push(null);
    }
};