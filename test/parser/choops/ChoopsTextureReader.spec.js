const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const IFFReader = require('../../../src/parser/IFFReader');
const ChoopsTextureReader = require('../../../src/parser/choops/ChoopsTextureReader');

let file;
let textureReader = new ChoopsTextureReader();
const SAMPLE_IFF_PATH = path.join(__dirname, '../../data/iff/two-files.iff');

describe('Choops Texture Reader', () => {
    before(async () => {
        const reader = new IFFReader();

        file = await new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(SAMPLE_IFF_PATH),
                reader,
                (err) => {
                    if (err) reject(err);
                    else resolve(reader.file);
                }
            );
        });
    });

    it('can extract expected texture data to GTF', async () => {
        const firstTextureFile = file.files[0];
        const firstTextureGtf = await textureReader.toGTFFromFile(firstTextureFile);
        
        expect(firstTextureGtf.readUInt32BE(0x0)).to.equal(0x1080000);  // version
        expect(firstTextureGtf.readUInt32BE(0x4)).to.equal(0x1030);     // file size
        expect(firstTextureGtf.readUInt32BE(0x8)).to.equal(0x1);        // number of textures

        expect(firstTextureGtf.readUInt32BE(0xC)).to.equal(0x0);        // id
        expect(firstTextureGtf.readUInt32BE(0x10)).to.equal(0x30);      // offset to texture
        expect(firstTextureGtf.readUInt32BE(0x14)).to.equal(0x1000);    // texture size
        expect(firstTextureGtf.readUInt8(0x18)).to.equal(0x86);         // format
        expect(firstTextureGtf.readUInt8(0x19)).to.equal(0x1);          // mipmap
        expect(firstTextureGtf.readUInt8(0x1A)).to.equal(0x2);          // dimension
        expect(firstTextureGtf.readUInt8(0x1B)).to.equal(0x0);          // cubemap
        expect(firstTextureGtf.readUInt32BE(0x1C)).to.equal(0xAAE4);    // remap
        expect(firstTextureGtf.readUInt16BE(0x20)).to.equal(0x80);      // width
        expect(firstTextureGtf.readUInt16BE(0x22)).to.equal(0x40);      // height
        expect(firstTextureGtf.readUInt16BE(0x24)).to.equal(0x1);       // normalized
        expect(firstTextureGtf.readUInt16BE(0x26)).to.equal(0x0);       // depth
        expect(firstTextureGtf.readUInt32BE(0x28)).to.equal(0x100);     // pitch
        expect(firstTextureGtf.readUInt32BE(0x2C)).to.equal(0x0);       // offset

        expect(firstTextureGtf.readUInt32BE(0x30)).to.equal(0xD494D494);    // first bytes of texture

        expect(firstTextureGtf.length).to.equal(0x1030);
    });

    it('can extract a DDS from a file', async () => {
        const firstTextureFile = file.files[0];
        const firstTextureDds = await textureReader.toDDSFromFile(firstTextureFile);

        expect(firstTextureDds.length).to.equal(0x1080);
    });
});