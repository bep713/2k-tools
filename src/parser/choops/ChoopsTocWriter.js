const { Readable } = require('stream');

class ChoopsTocWriter extends Readable {
    constructor(archive) {
        super();

        this.archive = archive;

        let fileHeaderBuffer = Buffer.alloc(0x18);
        fileHeaderBuffer.writeUInt32BE(archive.magic, 0x0);
        fileHeaderBuffer.writeUInt32BE(archive.alignment, 0x4);
        fileHeaderBuffer.writeUInt32BE(archive.numberOfArchives, 0x8);
        fileHeaderBuffer.writeUInt32BE(archive.zero, 0xC);
        fileHeaderBuffer.writeUInt32BE(archive.numberOfFiles, 0x10);
        fileHeaderBuffer.writeUInt32BE(archive.zero2, 0x14);

        this.push(fileHeaderBuffer);

        let archiveBuffer = Buffer.alloc(archive.numberOfArchives * 0x10);
        let currentOffset = 0;

        archive.archives.forEach((theArchive) => {
            archiveBuffer.writeUInt32BE(theArchive.sizeRaw, currentOffset);
            archiveBuffer.writeUInt32BE(theArchive.zero, currentOffset + 4);
            archiveBuffer.write(theArchive.name, currentOffset + 8);
            
            currentOffset += 0x10;
        });

        this.push(archiveBuffer);

        let tocBuffer = Buffer.alloc(archive.numberOfFiles * 0x10);
        currentOffset = 0;

        // Re-sort the TOC in game archive index
        archive.toc.sort((a, b) => {
            return a.id - b.id;
        });

        // Write the TOC data
        archive.toc.forEach((tocEntry) => {
            tocBuffer.writeUInt32BE(tocEntry.nameHash, currentOffset);
            tocBuffer.writeUInt32BE(tocEntry.rawOffset, currentOffset + 4);
            tocBuffer.writeBigUInt64BE(BigInt(tocEntry.size), currentOffset + 8);

            currentOffset += 0x10;
        });

        this.push(tocBuffer);
        this.push(null);
    };
};

module.exports = ChoopsTocWriter;