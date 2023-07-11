const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const IFFReader = require('../../src/parser/IFFReader');
const IFFType = require('../../src/model/general/iff/IFFType');

const PATH_TO_SIMPLE_IFF = path.join(__dirname, '../data/iff/simple.iff');
const PATH_TO_TWO_FILE_IFF = path.join(__dirname, '../data/iff/two-files.iff');

describe('IFFReader tests', () => {
    describe('simple IFF', () => {
        let reader, iff, emittedBlockData, emittedFileData;

        beforeEach(async () => {
            emittedBlockData = [];
            emittedFileData = [];

            reader = new IFFReader();

            reader.on('block-data', (data) => {
                emittedBlockData.push(data);
            });

            reader.on('file-data', (data) => {
                emittedFileData.push(data);
            });

            await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_SIMPLE_IFF),
                    reader,
                    (err) => {
                        if (err) { reject(err); }
                        else { resolve(); }
                    }
                );
            });

            iff = reader.file;
        });

        it('expected file header', () => {
            expect(iff.magic).to.equal(0xFF3BEF94);
            expect(iff.headerSize).to.equal(0x54);
            expect(iff.fileLength).to.equal(0x37F8);
            expect(iff.zero).to.equal(0x0);
            expect(iff.blockCount).to.equal(0x1);
            expect(iff.unk1).to.equal(0xD);
            expect(iff.fileCount).to.equal(0x1);
            expect(iff.unk2).to.equal(0x25);
        });

        it('expected block', () => {
            expect(iff.blocks.length).to.equal(1);

            const firstBlock = iff.blocks[0];
            expect(firstBlock.name).to.equal(0xBB05A9C1);
            expect(firstBlock.type).to.equal(0xBB05A9C1);
            expect(firstBlock.unk1).to.equal(0x80);
            expect(firstBlock.uncompressedLength).to.equal(0x5956);
            expect(firstBlock.unk2).to.equal(0x7);
            expect(firstBlock.startOffset).to.equal(0x54);
            expect(firstBlock.compressedLength).to.equal(0x5956);
            expect(firstBlock.isIndexed).to.equal(0x0);
        });

        it('expected files', () => {
            expect(iff.files.length).to.equal(1);

            const firstFile = iff.files[0];
            expect(firstFile.id).to.equal(0xCFE58145);
            expect(firstFile.name).to.equal('hi_shoe1');
            expect(firstFile.typeRaw).to.equal(0xE26C9B5D);
            expect(firstFile.type).to.equal(IFFType.TYPES.SCNE);
            expect(firstFile.offsetCount).to.equal(1);
            expect(firstFile.dataBlocks.length).to.equal(1);
            expect(firstFile.dataBlocks[0].offset).to.equal(0);
        });

        it('outputs events for each block', () => {
            expect(emittedBlockData.length).to.equal(1);
            expect(emittedBlockData[0]).to.eql(iff.blocks[0]);
            expect(emittedBlockData[0].data.length).to.equal(iff.blocks[0].uncompressedLength);
        });

        it('does not decompress blocks if flag is set', async () => {
            emittedBlockData = [];

            reader = new IFFReader({
                decompressBlocks: false
            });

            reader.on('block-data', (data) => {
                emittedBlockData.push(data);
            });

            await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_SIMPLE_IFF),
                    reader,
                    (err) => {
                        if (err) { reject(err); }
                        else { resolve(); }
                    }
                );
            });

            expect(emittedBlockData.length).to.equal(1);
            expect(emittedBlockData[0].data.length).to.equal(emittedBlockData[0].compressedLength)
        });

        it('outputs an event for each file', () => {
            expect(emittedFileData.length).to.equal(1);
            expect(emittedFileData[0]).to.eql(iff.files[0]);
            expect(emittedFileData[0].dataBlocks[0].data.length).to.equal(iff.blocks[0].uncompressedLength);
        });
    });

    describe('two file IFF', () => {
        let reader, iff, emittedBlockData, emittedFileData;

        beforeEach(async () => {
            emittedBlockData = [];
            emittedFileData = [];

            reader = new IFFReader();

            reader.on('block-data', (data) => {
                emittedBlockData.push(data);
            });

            reader.on('file-data', (data) => {
                emittedFileData.push(data);
            });

            await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_TWO_FILE_IFF),
                    reader,
                    (err) => {
                        if (err) { reject(err); }
                        else { resolve(); }
                    }
                );
            });

            iff = reader.file;
        });

        it('expected files', () => {
            expect(iff.files.length).to.equal(2);

            const firstFile = iff.files[0];
            expect(firstFile.name).to.equal('shoe_sole');
            expect(firstFile.type).to.equal(IFFType.TYPES.TXTR);
            expect(firstFile.dataBlocks[0].length).to.equal(176);
            expect(firstFile.dataBlocks[1].length).to.equal(4096);

            const secondFile = iff.files[1];
            expect(secondFile.name).to.equal('shoe_upper');
            expect(secondFile.type).to.equal(IFFType.TYPES.TXTR);
            expect(secondFile.dataBlocks[0].length).to.equal(176);
            expect(secondFile.dataBlocks[1].length).to.equal(32768);
        });
    });
});