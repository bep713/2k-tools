const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const IFFReader = require('../../src/parser/IFFReader');

const PATH_TO_SIMPLE_IFF = path.join(__dirname, '../data/iff/simple.iff');

describe('IFFReader tests', () => {
    describe('simple IFF', () => {
        let reader, iff;

        beforeEach(async () => {
            reader = new IFFReader();

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
            expect(firstBlock.compressedLength).to.equal(0x37A4);
            expect(firstBlock.isIndexed).to.equal(0x0);
        });
    });
});