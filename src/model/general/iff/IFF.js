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
        
        this.nameDataBuf = null;
        this.dataFileOffsetBuf = null;
    };

    updateBlockDataAndOffsets() {
        let blockOffset = this.headerSize;
        
        this.blocks.forEach((block, blockIndex) => {
            let blockLength = 0;

            block.startOffset = blockOffset;

            let blockData = [];

            this.files.forEach((file) => {
                if (file.dataBlocks.length > blockIndex) {
                    let fileBlock = file.dataBlocks[blockIndex];
                    
                    fileBlock.offset = blockLength;
                    blockLength += fileBlock.data.length;
                    blockData.push(fileBlock.data);
                }
            });

            block.data = Buffer.concat(blockData);

            if (block.isCompressed) {
                block.compressedLength = blockLength;
            }
            else {
                block.compressedLength = blockLength;
                block.uncompressedLength = blockLength;
            }

            blockOffset += blockLength;
        });

        this.fileLength = blockOffset;
    };
};

module.exports = IFF;