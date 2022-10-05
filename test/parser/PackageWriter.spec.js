const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const PackageReader = require('../../src/parser/PackageReader');
const PackageWriter = require('../../src/parser/PackageWriter');

const PATH_TO_SCNE = path.join(__dirname, '../data/scne/arena.SCNE');

let writer = new PackageWriter();

describe('Package Writer tests', () => {
    describe('no changes', () => {
        let outputBuffer = null, outputBuffers = [];

        before(async () => {
            await new Promise(async (resolve, reject) => {
                const reader = new PackageReader({
                    headerBlockSize: 0x34000,
                    dataSize: 0x357500
                });
    
                const file = await new Promise((resolve, reject) => {
                    pipeline(
                        fs.createReadStream(PATH_TO_SCNE),
                        reader,
                        (err) => {
                            if (err) reject(err);
                            resolve(reader.file);
                        }
                    );
                });
    
                writer = new PackageWriter(file);
                const stream = writer.createStream();
                
                stream.on('data', (chunk) => {
                    outputBuffers.push(chunk);
                });
    
                stream.on('end', () => {
                    outputBuffer = Buffer.concat(outputBuffers);
                    resolve();
                });
            });
        });
    
        it('header', () => {
            expect(outputBuffer.readUInt32BE(0x0)).to.equal(0x33FF5);       // name offset
            expect(outputBuffer.readUInt32BE(0x4)).to.equal(0);             // unk1
            expect(outputBuffer.readUInt32BE(0x8)).to.equal(0);             // unk2
            expect(outputBuffer.readUInt32BE(0xC)).to.equal(0x7F7FFFFF);    // unk3
            expect(outputBuffer.readUInt32BE(0x10)).to.equal(0);            // unk4
            expect(outputBuffer.readUInt32BE(0x14)).to.equal(0);            // unk5
            expect(outputBuffer.readUInt32BE(0x18)).to.equal(0);            // unk6
            expect(outputBuffer.readUInt32BE(0x1C)).to.equal(0);            // unk7
            expect(outputBuffer.readUInt32BE(0x20)).to.equal(0x27);         // numTextures
            expect(outputBuffer.readUInt32BE(0x24)).to.equal(0x6D);         // relativeTextureOffset
            expect(outputBuffer.readUInt32BE(0x28)).to.equal(0x5);          // unk8
            expect(outputBuffer.readUInt32BE(0x2C)).to.equal(0x1B35);       // unk9
            expect(outputBuffer.readUInt32BE(0x30)).to.equal(0x3D);         // unk10
            expect(outputBuffer.readUInt32BE(0x34)).to.equal(0x0);          // unk11
            expect(outputBuffer.readUInt32BE(0x38)).to.equal(0x1C19);       // unk12
            expect(outputBuffer.readUInt32BE(0x3C)).to.equal(0x50);         // unk13
            expect(outputBuffer.readUInt32BE(0x40)).to.equal(0x5CA1);       // unk14
            expect(outputBuffer.readUInt32BE(0x44)).to.equal(0x50);         // numModelParts
            expect(outputBuffer.readUInt32BE(0x48)).to.equal(0x2599);       // relativeModelPartOffset
            expect(outputBuffer.readUInt32BE(0x4C)).to.equal(0x0);          // unk15
            expect(outputBuffer.readUInt32BE(0x50)).to.equal(0x8991);       // unk16
            
            // header trailer
            let trailerPosition = 0x54;
            let numUIntBlocks = 0xF;

            for (let i = 0; i < numUIntBlocks; i += 1) {
                expect(outputBuffer.readUInt32BE(trailerPosition)).to.equal(0x0);
                trailerPosition += 4;
            }
        });
        
        it('texture headers', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x90)).to.equal(0x99D70699);
            expect(outputBuffer.readUInt32BE(0x94)).to.equal(0x0);
            expect(outputBuffer.readUInt32BE(0x98)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x9C)).to.equal(0xA9A886);

            // tex #1
            expect(outputBuffer.readUInt32BE(0x140)).to.equal(0xABF3B360);

            // tex #15
            expect(outputBuffer.readUInt32BE(0xAE0)).to.equal(0x35705AC4);
        });

        it('post texture headers', () => {
            expect(outputBuffer.readUInt32BE(0x1B60)).to.equal(0x9BF5D4AE);
            expect(outputBuffer.readUInt32BE(0x33FF0)).to.equal(0x320000);
        });

        it('package name', () => {
            expect(outputBuffer.readUInt32BE(0x33FF4)).to.equal(0x610072);
            expect(outputBuffer.readUInt32BE(0x33FF8)).to.equal(0x65006E);
            expect(outputBuffer.readUInt32BE(0x33FFC)).to.equal(0x610000);
        });

        it('texture data', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x34000)).to.equal(0xA0040004);

            // tex #1
            expect(outputBuffer.readUInt32BE(0x3EB00)).to.equal(0xCD292B19);

            // tex #15
            expect(outputBuffer.readUInt32BE(0x65F00)).to.equal(0x6D6BCB5A);
        });

        it('file size', () => {
            expect(outputBuffer.length).to.equal(0x357500);
        });
    });

    describe('one change', () => {
        let outputBuffer = null, outputBuffers = [];

        before(async () => {
            await new Promise(async (resolve, reject) => {
                const reader = new PackageReader({
                    headerBlockSize: 0x34000,
                    dataSize: 0x357500
                });
    
                const file = await new Promise((resolve, reject) => {
                    pipeline(
                        fs.createReadStream(PATH_TO_SCNE),
                        reader,
                        (err) => {
                            if (err) reject(err);
                            resolve(reader.file);
                        }
                    );
                });

                file.textures[1].header = Buffer.from(file.textures[0].header);
                file.textures[1].data = Buffer.from(file.textures[0].data);
    
                writer = new PackageWriter(file);
                const stream = writer.createStream();
                
                stream.on('data', (chunk) => {
                    outputBuffers.push(chunk);
                });
    
                stream.on('end', () => {
                    outputBuffer = Buffer.concat(outputBuffers);
                    resolve();
                });
            });
        });

        it('texture headers', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x90)).to.equal(0x99D70699);
            expect(outputBuffer.readUInt32BE(0x94)).to.equal(0x0);
            expect(outputBuffer.readUInt32BE(0x98)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x9C)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x134)).to.equal(0x1);

            // tex #1 = tex #0 now
            expect(outputBuffer.readUInt32BE(0x140)).to.equal(0x99D70699);
            expect(outputBuffer.readUInt32BE(0x144)).to.equal(0x0);
            expect(outputBuffer.readUInt32BE(0x148)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x14C)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x1E4)).to.equal(0x323501);        // offset points to the end of the original file

            // tex #15
            expect(outputBuffer.readUInt32BE(0xAE0)).to.equal(0x35705AC4);
        });

        it('texture data', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x34000)).to.equal(0xA0040004);

            // original tex #1 - still intact
            expect(outputBuffer.readUInt32BE(0x3EB00)).to.equal(0xCD292B19);    // original data doesn't change

            // tex #15
            expect(outputBuffer.readUInt32BE(0x65F00)).to.equal(0x6D6BCB5A);

            // real tex #1
            expect(outputBuffer.readUInt32BE(0x357500)).to.equal(0xA0040004);
        });

        it('file size', () => {
            expect(outputBuffer.length).to.equal(0x362000); // tex #1 new size = +0xAB00
        });
    });

    describe('changing the last texture', () => {
        let outputBuffer = null, outputBuffers = [];

        before(async () => {
            await new Promise(async (resolve, reject) => {
                const reader = new PackageReader({
                    headerBlockSize: 0x34000,
                    dataSize: 0x357500
                });
    
                const file = await new Promise((resolve, reject) => {
                    pipeline(
                        fs.createReadStream(PATH_TO_SCNE),
                        reader,
                        (err) => {
                            if (err) reject(err);
                            resolve(reader.file);
                        }
                    );
                });

                file.textures[38].header = Buffer.from(file.textures[0].header);
                file.textures[38].data = Buffer.from(file.textures[0].data);
    
                writer = new PackageWriter(file);
                const stream = writer.createStream();
                
                stream.on('data', (chunk) => {
                    outputBuffers.push(chunk);
                });
    
                stream.on('end', () => {
                    outputBuffer = Buffer.concat(outputBuffers);
                    resolve();
                });
            });
        });

        it('texture headers', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x90)).to.equal(0x99D70699);
            expect(outputBuffer.readUInt32BE(0x94)).to.equal(0x0);
            expect(outputBuffer.readUInt32BE(0x98)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x9C)).to.equal(0xA9A886);
            expect(outputBuffer.readUInt32BE(0x134)).to.equal(0x1);

            // tex #1
            expect(outputBuffer.readUInt32BE(0x140)).to.equal(0xABF3B360);

            // tex #15
            expect(outputBuffer.readUInt32BE(0xAE0)).to.equal(0x35705AC4);

            // tex #38
            expect(outputBuffer.readUInt32BE(0x1AB0)).to.equal(0x99D70699);
        });

        it('texture data', () => {
            // tex #0
            expect(outputBuffer.readUInt32BE(0x34000)).to.equal(0xA0040004);

            // tex #1
            expect(outputBuffer.readUInt32BE(0x3EB00)).to.equal(0xCD292B19);

            // tex #15
            expect(outputBuffer.readUInt32BE(0x65F00)).to.equal(0x6D6BCB5A);

            // tex #38
            expect(outputBuffer.readUInt32BE(0xE2554)).to.equal(0x28);              // tex 38 first bytes are 0s. Read +D4 offset

            // real tex #38
            expect(outputBuffer.readUInt32BE(0x357500)).to.equal(0xA0040004);
        });

        it('file size', () => {
            expect(outputBuffer.length).to.equal(0x362000);
        });
    });
});