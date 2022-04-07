const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const IFFReader = require('../../../src/parser/IFFReader');
const ChoopsTextureWriter = require('../../../src/parser/choops/ChoopsTextureWriter');

let file;
let textureWriter = new ChoopsTextureWriter();

const DDS_PATH = path.join(__dirname, '../../data/dds/abl_logo.dds');

describe('Choops Texture Writer tests', () => {
    it('can convert a DDS file to a file', async () => {
        const writer = new ChoopsTextureWriter();

        const file = {
            id: 0x7D3C985C,
            name: 'test',
            dataBlocks: [{
                offset: 0,
                length: 0x10000,
                data: Buffer.alloc(0x10000)
            }, {
                offset: 0,
                length: 0x10000,
                data: Buffer.alloc(0x10000)
            }]
        };

        await writer.toFileFromDDSPath(DDS_PATH, file);

        expect(file.dataBlocks[0].data.readUInt32BE(0x4C)).to.equal(0);
        expect(file.dataBlocks[0].data.readUInt32BE(0x50)).to.equal(0);
        expect(file.dataBlocks[0].data.readUInt32BE(0x54)).to.equal(0);
        expect(file.dataBlocks[0].data.readUInt32BE(0x58)).to.equal(0x88090200);
        expect(file.dataBlocks[0].data.readUInt32BE(0x5C)).to.equal(0x0000AAE4);
        expect(file.dataBlocks[0].data.readUInt32BE(0x60)).to.equal(0x01000100);
        expect(file.dataBlocks[0].data.readUInt32BE(0x64)).to.equal(0x00010000);
        expect(file.dataBlocks[0].data.readUInt32BE(0x68)).to.equal(0x00000000);
        expect(file.dataBlocks[0].data.readUInt32BE(0x6C)).to.equal(0x0);

        expect(file.dataBlocks[1].length).to.equal(0x15580);
    });
});