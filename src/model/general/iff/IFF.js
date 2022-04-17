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
        this.fileNameDefintions = [];
        
        this._isChanged = false;
        this.nameDataBuf = null;
        this.dataFileOffsetBuf = null;
    };

    get isChanged() {
        const changedBlocks = this.blocks.filter((block) => {
            return block.isChanged;
        });

        const changedDataFiles = this.files.filter((file) => {
            return file.isChanged;
        });

        return this._isChanged || changedBlocks.length > 0 || changedDataFiles.length > 0;
    };

    set isChanged(isChanged) {
        this._isChanged = isChanged;
    };

    updateBlockDataAndOffsets() {
        let blockOffset = this.headerSize;
        
        this.blocks.forEach((block, blockIndex) => {
            let blockLength = 0;
            let priorBlockChangedStatus = block.isChanged;

            block.startOffset = blockOffset;

            let blockData = [];

            const filesInThisBlock = this.files.filter(file => {
                return file.offsetCount >= (blockIndex + 1);
            });

            filesInThisBlock.sort((a, b) => {
                return a.dataBlocks[blockIndex].index - b.dataBlocks[blockIndex].index;
            });

            filesInThisBlock.forEach((file) => {
                let fileBlock = file.dataBlocks[blockIndex];
                
                fileBlock.offset = blockLength;
                blockLength += fileBlock.data.length;
                blockData.push(fileBlock.data);
            });

            block.data = Buffer.concat(blockData);

            if (block.isCompressed) {
                block.compressedLength = blockLength;
            }
            else {
                block.compressedLength = blockLength;
                block.uncompressedLength = blockLength;
            }

            block.isChanged = priorBlockChangedStatus;
            blockOffset += blockLength;
        });

        this.fileLength = blockOffset;
    };
};

module.exports = IFF;