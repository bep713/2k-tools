class IFFDataFile {
    constructor() {
        this.id = 0;
        this.type = 0;
        this.name = '';
        this.index = 0;
        this.typeRaw = 0;
        this.offsetCount = 0;
        this.dataBlocks = [];
    };
};

module.exports = IFFDataFile;