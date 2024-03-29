const FileParser = require('./FileParser');
const PackageController = require('../controller/PackageController');
const PackageTexture = require('../model/general/iff/PackageTexture');

class PackageReader extends FileParser {
    constructor(options) {
        super();

        this.controller = new PackageController();
        this.file = this.controller.file;

        this.headerBlockSize = options && options.headerBlockSize ? options.headerBlockSize : 0;
        this.dataSize = options && options.dataSize ? options.dataSize : 0;
        
        this.textureDataBytesRead = 0;

        this.bytes(0x54, this._onFileHeader);
    };

    _onFileHeader(buf) {
        this.textureDataBytesRead = 0;

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

        if (this.file.numberOfTextures > 0) {
            this.bytes(this.file.textureOffset - this.currentBufferIndex, this._onHeaderTrailer);
        }
        else {
            this.skipBytes(Infinity);
        }
    };

    _onHeaderTrailer(buf) {
        this.file.bufs.headerTrailer = buf;
        this.bytes(0xB0, this._onTextureHeader);
    };

    _onTextureHeader(buf) {
        let texture = new PackageTexture();
        texture.index = this.file.textures.length;
        texture.name = `texture_${texture.index}`;
        texture.header = buf;
        texture.relativeDataOffset = buf.readUInt32BE(0xA4);
        texture.originalRelativeDataOffset = texture.relativeDataOffset;

        this.file.textures.push(texture);

        if (this.file.textures.length < this.file.numberOfTextures) {
            this.bytes(0xB0, this._onTextureHeader);
        }
        else {
            this.file.textures.sort((a, b) => {
                return a.relativeDataOffset - b.relativeDataOffset;
            });

            this.file.textures.forEach((texture, index) => texture.dataIndex = index);

            const postTextureHeaderBytes = this.file.nameOffset - 1 - this.currentBufferIndex;

            if (postTextureHeaderBytes > 0) {
                this.bytes(postTextureHeaderBytes, this._onPostTextureHeaders);
            }
            else {
                this.bytes(0x2, this._onPackageName);
            }
        }
    };

    _onPostTextureHeaders(buf) {
        this.file.bufs.postTextureHeaders = buf;
        this.bytes(0x2, this._onPackageName);
    };

    _onPackageName(buf) {
        if (buf.readUInt16BE(0) !== 0) {
            buf.reverse();  // string is utf16be, but NodeJS does not support that so swap the bytes.
            this.file.name += buf.toString('utf16le');
            this.bytes(0x2, this._onPackageName);
        }
        else {
            if (this.headerBlockSize > 0) {
                const postPackageNameBytes = this.headerBlockSize - this.currentBufferIndex;
    
                if (postPackageNameBytes <= 0) {
                    return this._onTextureDataStart(0);
                }
                else {
                    this.bytes(postPackageNameBytes, this._onPostPackageName);
                }
            }
            else {
                return this._onTextureDataStart(0);
            }
        }
    };

    _onPostPackageName(buf) {
        this.file.bufs.postPackageName = buf;
        this._onTextureDataStart(0);
    };

    _onTextureDataStart(index) {
        let currentTextureOffset = this.file.textures[index].relativeDataOffset - 1;
        let currentTextureSize = 0;
        
        // Textures can become out of order after importing
        if (this.textureDataBytesRead < currentTextureOffset) {
            this.bytes(currentTextureOffset - this.textureDataBytesRead, (buf) => {
                this.textureDataBytesRead += buf.length;
                this.file.textures[index].preData = buf;
                this._onTextureDataStart(index);
            });
        }
        else {
            if (index < this.file.numberOfTextures - 1) {
                let nextTextureOffset = this.file.textures[index + 1].relativeDataOffset - 1;
                currentTextureSize = nextTextureOffset - currentTextureOffset;            
            }
            else {
                currentTextureSize = this.dataSize - this.currentBufferIndex;  // parse till end of file
            }
    
            this.bytes(currentTextureSize, (buf) => {
                this.textureDataBytesRead += buf.length;
                this._onTextureData(buf, index);
            });
        }
    };

    _onTextureData(buf, index) {
        this.file.textures[index].data = buf;
        this.file.textures[index].originalData = buf;
        this.file.textures[index].isChanged = false;    // reset changed indicator after populating data

        if ((index + 1) < this.file.numberOfTextures) {
            return this._onTextureDataStart(index + 1);
        }
        else {
            this.file.textures.sort((a, b) => {
                return a.index - b.index;
            });

            this.skipBytes(Infinity);
        }
    };
};

module.exports = PackageReader;