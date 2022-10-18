const { Readable } = require('stream');

class ChoopsTocWriter {
    constructor(archive) {
        this.archive = archive;
    };

    createStream() {
        return new ChoopsTocWriterReadable(this.archive, this.calculateTOCLength());
    };

    calculateTOCLength() {
        const actualTocLength = 0x18 + (this.archive.numberOfArchives * 0x10) + (this.archive.numberOfFiles * 0x10);

        if (actualTocLength % this.archive.alignment === 0) {
            return actualTocLength;
        }
        else {
            return (Math.floor(actualTocLength / this.archive.alignment) + 1) * this.archive.alignment;
        }
    };
};

module.exports = ChoopsTocWriter;

class ChoopsTocWriterReadable extends Readable {
    constructor(archive, size) {
        super();
        this.archive = archive;

        let runningLength = 0;

        let fileHeaderBuffer = Buffer.alloc(0x18);
        fileHeaderBuffer.writeUInt32BE(this.archive.magic, 0x0);
        fileHeaderBuffer.writeUInt32BE(this.archive.alignment, 0x4);
        fileHeaderBuffer.writeUInt32BE(this.archive.numberOfArchives, 0x8);
        fileHeaderBuffer.writeUInt32BE(this.archive.zero, 0xC);
        fileHeaderBuffer.writeUInt32BE(this.archive.numberOfFiles, 0x10);
        fileHeaderBuffer.writeUInt32BE(this.archive.zero2, 0x14);

        this.push(fileHeaderBuffer);
        runningLength += fileHeaderBuffer.length;

        let archiveBuffer = Buffer.alloc(this.archive.numberOfArchives * 0x10);
        let currentOffset = 0;

        this.archive.archives.forEach((theArchive) => {
            archiveBuffer.writeUInt32BE(Number(theArchive.sizeRaw), currentOffset);
            archiveBuffer.writeUInt32BE(theArchive.zero, currentOffset + 4);
            archiveBuffer.write(theArchive.name, currentOffset + 8);
            
            currentOffset += 0x10;
        });

        this.push(archiveBuffer);
        runningLength += archiveBuffer.length;

        let tocBuffer = Buffer.alloc(size - runningLength);
        currentOffset = 0;

        // Re-sort the TOC in game archive index
        this.archive.toc.sort((a, b) => {
            return a.id - b.id;
        });

        // Write the TOC data
        this.archive.toc.forEach((tocEntry) => {
            tocBuffer.writeUInt32BE(tocEntry.nameHash, currentOffset);
            tocBuffer.writeUInt32BE(tocEntry.rawOffset, currentOffset + 4);
            tocBuffer.writeBigUInt64BE(BigInt(tocEntry.size), currentOffset + 8);

            currentOffset += 0x10;
        });

        this.push(tocBuffer);
        this.push(null);
    };
};