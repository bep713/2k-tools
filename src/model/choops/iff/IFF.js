class IFF {
    constructor() {
        this.magic = 0;
        this.headerSize = 0;
        this.fileLength = 0;
        this.zero = 0;
        this.blockCount = 0;
        this.unk1 = 0;
        this.fileCount = 0;
        this.unk2 = 0;
        this.unk3 = 0;
        this.nameOffset = 0;

        this.files = [];
        this.blocks = [];
    };
};

module.exports = IFF;