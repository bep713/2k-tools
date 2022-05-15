const { Readable } = require('stream');

class PackageWriter {
    constructor(file) {
        this.file = file;

        if (this.file) {
            this.file.updateOffsets();
        }
    };

    createStream() {
        return new PackageWriterReadable(this.file);
    };
};

class PackageWriterReadable extends Readable {
    constructor(file) {
        super();
        this.file = file;

        let header = Buffer.alloc(0x54 + this.file.bufs.headerTrailer.length);

        header.writeUInt32BE(this.file.nameOffset, 0x0);
        header.writeUInt32BE(this.file.unk1, 0x4);
        header.writeUInt32BE(this.file.unk2, 0x8);
        header.writeUInt32BE(this.file.unk3, 0xC);
        header.writeUInt32BE(this.file.unk4, 0x10);
        header.writeUInt32BE(this.file.unk5, 0x14);
        header.writeUInt32BE(this.file.unk6, 0x18);
        header.writeUInt32BE(this.file.unk7, 0x1C);
        header.writeUInt32BE(this.file.numberOfTextures, 0x20);
        header.writeUInt32BE(this.file.relativeTextureOffset, 0x24);
        header.writeUInt32BE(this.file.unk8, 0x28);
        header.writeUInt32BE(this.file.unk9, 0x2C);
        header.writeUInt32BE(this.file.unk10, 0x30);
        header.writeUInt32BE(this.file.unk11, 0x34);
        header.writeUInt32BE(this.file.unk12, 0x38);
        header.writeUInt32BE(this.file.unk13, 0x3C);
        header.writeUInt32BE(this.file.unk14, 0x40);
        header.writeUInt32BE(this.file.numberOfModelParts, 0x44);
        header.writeUInt32BE(this.file.relativeModelPartsOffset, 0x48);
        header.writeUInt32BE(this.file.unk15, 0x4C);
        header.writeUInt32BE(this.file.unk16, 0x50);

        header.fill(this.file.bufs.headerTrailer, 0x54);

        this.push(header);

        this.file.textures.forEach((texture) => {
            this.push(texture.header);
        });

        this.push(this.file.bufs.postTextureHeaders);

        const nameBuffer = Buffer.from(this.file.name, 'utf16le');
        this.push(nameBuffer.swap16());
        this.push(Buffer.from([0x00, 0x00]));   // package name end

        if (this.file.bufs.postPackageName) {
            this.push(this.file.bufs.postPackageName);
        }

        this.file.textures.forEach((texture) => {
            this.push(texture.data);
        });

        this.push(null);
    };
};

module.exports = PackageWriter;