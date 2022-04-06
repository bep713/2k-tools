const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const IFFReader = require('../../src/parser/IFFReader');
const IFFController = require('../../src/controller/IFFController');

const PATH_TO_SIMPLE_IFF = path.join(__dirname, '../data/iff/simple.iff');
const PATH_TO_TWO_FILE_IFF = path.join(__dirname, '../data/iff/two-files.iff');

let controller = new IFFController();

describe('IFF Controller tests', () => {
    describe('simple', () => {
        beforeEach(async () => {
            const reader = new IFFReader();
    
            controller = await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_SIMPLE_IFF),
                    reader,
                    (err) => {
                        if (err) reject(err);
                        resolve(reader.controller);
                    }
                )
            });
        });
    
        it('can get the underlying file', () => {
            expect(controller.file).to.exist;
            expect(controller.file.files.length).to.equal(1);
        });
    
        it('can get a resource\'s raw data by name', async () => {
            const shoeScne = await controller.getFileRawData('hi_shoe1');
            expect(shoeScne).to.exist;
            expect(shoeScne.dataBlocks.length).to.equal(1);
            expect(shoeScne.dataBlocks[0].length).to.equal(22870);
        });
    });

    describe('texture', () => {
        beforeEach(async () => {
            const reader = new IFFReader();
    
            controller = await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_TWO_FILE_IFF),
                    reader,
                    (err) => {
                        if (err) reject(err);
                        resolve(reader.controller);
                    }
                )
            });
        });

        it('can get a texture file', async () => {
            const texture = await controller.getFile('shoe_sole');
            // expect(texture)
        });
    });
});