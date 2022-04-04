class IFFBlock {
    constructor() {
        this.index = 0;
        this.name = 0;
        this.type = 0;
        this.unk1 = 0;
        this.uncompressedLength = 0;
        this.unk2 = 0;
        this.startOffset = 0;
        this.compressedLength = 0;
        this.isIndexed = 0;
        this.data = null;
    };

    get isCompressed() {
        return this.uncompressedLength !== this.compressedLength;
    };
};

module.exports = IFFBlock;