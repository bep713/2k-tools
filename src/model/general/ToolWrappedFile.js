class ToolWrappedFile {
    constructor() {
        this.magic = 0;
        this.headerSize = 0;
        this.fileType = 0;
        this.numberOfBlocks = 0;
        this.blockSizes = [];
        this.blocks = [];
    };
};

module.exports = ToolWrappedFile;