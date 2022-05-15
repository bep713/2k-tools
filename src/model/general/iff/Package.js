class Package {
    constructor() {
        this.nameOffset = 0;
        this.name = '';
        this.unk1 = 0;
        this.unk2 = 0;
        this.unk3 = 0;
        this.unk4 = 0;
        this.unk5 = 0;
        this.unk6 = 0;
        this.unk7 = 0;
        this.numberOfTextures = 0;
        this.relativeTextureOffset = 0;
        this.textureOffset = 0;
        this.unk8 = 0;
        this.unk9 = 0;
        this.unk10 = 0;
        this.unk11 = 0;
        this.unk12 = 0;
        this.unk13 = 0;
        this.unk14 = 0;
        this.numberOfModelParts = 0;
        this.relativeModelPartsOffset = 0;
        this.modelPartsOffset = 0;
        this.unk15 = 0;
        this.unk16 = 0;

        this.bufs = {
            headerTrailer: null,
            postTextureHeaders: null,
            postPackageName: null,
            postTextureData: null
        };

        this.textures = [];
        this.modelParts = [];

        this.offsets = {
            nameOffset: 0,
            headerBlockSize: 0,
            dataBlockSize: 0,
            extraBlockSize: 0
        };
    };

    updateOffsets() {
        let headerSize = 0x54 + this.bufs.headerTrailer.length;
        let textureHeadersSize = this.textures.reduce((accum, cur) => {
            accum += cur.header.length;
            return accum;
        }, 0);

        this.offsets.nameOffset = headerSize + textureHeadersSize + this.bufs.postTextureHeaders.length;
        this.nameOffset = this.offsets.nameOffset + 1;

        this.offsets.headerBlockSize = this.offsets.nameOffset + (this.name.length * 2) + 2;

        if (this.bufs.postPackageName) {
            this.offsets.headerBlockSize += this.bufs.postPackageName.length;
        }
        
        let textureDataSize = this.textures.reduce((accum, cur) => {
            accum += cur.data.length;
            return accum;
        }, 0);

        this.offsets.dataBlockSize = textureDataSize;

        if (this.bufs.postTextureData) {
            this.offsets.dataBlockSize += this.bufs.postTextureData.length;
        }

        // Have to update each texture relative data offset
        let runningOffset = 1; // Choops offsets start at 1

        this.textures.forEach((texture) => {
            texture.relativeDataOffset = runningOffset - 1;     // This attribute contains the real offset.
            texture.header.writeUInt32BE(runningOffset, 0xA4);

            runningOffset += texture.data.length;
        });
    };
};

module.exports = Package;