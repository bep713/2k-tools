const FileParser = require('./FileParser');
const PackageController = require('../controller/PackageController');
const PackageTexture = require('../model/general/iff/PackageTexture');

class PackageReader extends FileParser {
    constructor() {
        super();

        this.controller = new PackageController();
        this.file = this.controller.file;

        this.bytes(0x54, this._onFileHeader);
    };

    _onFileHeader(buf) {
        this.file.nameOffset = buf.readUInt32BE(0x0);
        this.file.unk1 = buf.readUInt32BE(0x4);
        this.file.unk2 = buf.readUInt32BE(0x8);
        this.file.unk3 = buf.readUInt32BE(0xC);
        this.file.unk4 = buf.readUInt32BE(0x10);
        this.file.unk5 = buf.readUInt32BE(0x14);
        this.file.unk6 = buf.readUInt32BE(0x18);
        this.file.unk7 = buf.readUInt32BE(0x1C);

        this.file.numberOfTextures = buf.readUInt32BE(0x20);
        this.file.relativeTextureOffset = buf.readUInt32BE(0x24);
        this.file.textureOffset = this.file.relativeTextureOffset + 0x23;

        this.file.unk8 = buf.readUInt32BE(0x28);
        this.file.unk9 = buf.readUInt32BE(0x2C);
        this.file.unk10 = buf.readUInt32BE(0x30);
        this.file.unk11 = buf.readUInt32BE(0x34);
        this.file.unk12 = buf.readUInt32BE(0x38);
        this.file.unk13 = buf.readUInt32BE(0x3C);
        this.file.unk14 = buf.readUInt32BE(0x40);
        
        this.file.numberOfModelParts = buf.readUInt32BE(0x44);
        this.file.relativeModelPartsOffset = buf.readUInt32BE(0x48);
        this.file.modelPartsOffset = this.file.relativeModelPartsOffset + 0x47;

        this.file.unk15 = buf.readUInt32BE(0x4C);
        this.file.unk16 = buf.readUInt32BE(0x50);

        this.skipBytes(this.file.textureOffset - this.currentBufferIndex, () => {
            this.bytes(0xB0, this._onTextureHeader);
        });
    };

    _onTextureHeader(buf) {
        let texture = new PackageTexture();
        texture.header = buf;
        texture.relativeDataOffset = buf.readUInt32BE(0xA4);

        this.file.textures.push(texture);

        if (this.file.textures.length < this.file.numberOfTextures) {
            this.bytes(0xB0, this._onTextureHeader);
        }
        else {
            this.file.textures.sort((a, b) => {
                return a.relativeDataOffset - b.relativeDataOffset;
            });

            this.skipBytes(this.file.nameOffset - 1 - this.currentBufferIndex, () => {
                this.bytes(0x2, this._onPackageName);
            });
        }
    };

    _onPackageName(buf) {
        if (buf.readUInt16BE(0) !== 0) {
            buf.reverse();  // string is utf16be, but NodeJS does not support that so swap the bytes.
            this.file.name += buf.toString('utf16le');
            this.bytes(0x2, this._onPackageName);
        }
        else {
            return this._onTextureDataStart(0);
        }
    };

    _onTextureDataStart(index) {
        let currentTextureOffset = this.file.textures[index].relativeDataOffset - 1;
        let currentTextureSize = 0;

        if (index < this.file.numberOfTextures - 1) {
            let nextTextureOffset = this.file.textures[index + 1].relativeDataOffset - 1;
            currentTextureSize = nextTextureOffset - currentTextureOffset;            
        }
        else {
            currentTextureSize = 0x1000000000;  // parse till end of file
        }

        this.bytes(currentTextureSize, (buf) => {
            this._onTextureData(buf, index);
        });
    };

    _onTextureData(buf, index) {
        this.file.textures[index].data = buf;
        
        if ((index + 1) < this.file.numberOfTextures) {
            return this._onTextureDataStart(index + 1);
        }
        else {
            this.skipBytes(Infinity);
        }
    };
};

module.exports = PackageReader;