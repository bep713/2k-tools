const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const IFFReader = require('../../src/parser/IFFReader');
const IFFWriter = require('../../src/parser/IFFWriter');

let outputBuffer = null, outputBuffers = [];
const PATH_TO_SIMPLE_IFF = path.join(__dirname, '../data/iff/simple.iff');

let writer = new IFFWriter();

describe('IFF Writer tests', () => {
    before(async () => {
        await new Promise(async (resolve, reject) => {
            const reader = new IFFReader();

            const file = await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_SIMPLE_IFF),
                    reader,
                    (err) => {
                        if (err) reject(err);
                        resolve(reader.file);
                    }
                );
            });

            writer = new IFFWriter(file);
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

    it('generates expected file header', () => {
        expect(outputBuffer.readUInt32BE(0x0)).to.equal(0xFF3BEF94);    // magic
        expect(outputBuffer.readUInt32BE(0x4)).to.equal(0x54);          // header size
        expect(outputBuffer.readUInt32BE(0x8)).to.equal(0x59AA);        // file length: blocks were decompressed, so file length is larger
        expect(outputBuffer.readUInt32BE(0xC)).to.equal(0x0);           // zero
        expect(outputBuffer.readUInt32BE(0x10)).to.equal(0x1);          // block count
        expect(outputBuffer.readUInt32BE(0x14)).to.equal(0xD);          // unk1
        expect(outputBuffer.readUInt32BE(0x18)).to.equal(0x1);          // file count
        expect(outputBuffer.readUInt32BE(0x1C)).to.equal(0x25);         // unk2
    });

    it('generates expected file block headers', () => {
        expect(outputBuffer.readUInt32BE(0x20)).to.equal(0xBB05A9C1);   // name
        expect(outputBuffer.readUInt32BE(0x24)).to.equal(0xBB05A9C1);   // type
        expect(outputBuffer.readUInt32BE(0x28)).to.equal(0x80);         // unk1
        expect(outputBuffer.readUInt32BE(0x2C)).to.equal(0x5956);       // uncompressedLength
        expect(outputBuffer.readUInt32BE(0x30)).to.equal(0x7);          // unk2
        expect(outputBuffer.readUInt32BE(0x34)).to.equal(0x54);         // start offset
        expect(outputBuffer.readUInt32BE(0x38)).to.equal(0x5956);       // compressed length: blocks are decompressed, so size is same as uncompressed length
        expect(outputBuffer.readUInt32BE(0x3C)).to.equal(0x0);          // is indexed
    });

    it('generates expected data file offset buffer', () => {
        expect(outputBuffer.readUInt32BE(0x40)).to.equal(0x5);
    });

    it('generates expected data file headers', () => {
        expect(outputBuffer.readUInt32BE(0x44)).to.equal(0xCFE58145);   // id
        expect(outputBuffer.readUInt32BE(0x48)).to.equal(0xE26C9B5D);   // raw type
        expect(outputBuffer.readUInt32BE(0x4C)).to.equal(0x1);          // file offset count
        expect(outputBuffer.readUInt32BE(0x50)).to.equal(0x0);          // offset
    });

    it('writes block data', () => {
        expect(outputBuffer.length).to.be.greaterThan(0x59AA);
    });

    it('writes name data', () => {
        expect(outputBuffer.readUInt32BE(0x59AA)).to.equal(0xAA171516);
    });

    it('expected file size', () => {
        expect(outputBuffer.length).to.equal(0x5A0E);
    });

    it('expected length in archive', () => {
        expect(writer.lengthInArchive).to.equal(0x5A0E);
    });
});