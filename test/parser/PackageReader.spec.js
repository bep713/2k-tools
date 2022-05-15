const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const PackageReader = require('../../src/parser/PackageReader');

const PATH_TO_PACKAGE = path.join(__dirname, '../data/scne/arena.SCNE');

describe('Package Reader tests', () => {
    let reader, package, emittedBlockData, emittedFileData;

    beforeEach(async () => {
        emittedBlockData = [];
        emittedFileData = [];

        reader = new PackageReader();

        reader.on('block-data', (data) => {
            emittedBlockData.push(data);
        });

        reader.on('file-data', (data) => {
            emittedFileData.push(data);
        });

        await new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(PATH_TO_PACKAGE),
                reader,
                (err) => {
                    if (err) { reject(err); }
                    else { resolve(); }
                }
            );
        });

        package = reader.file;
    });

    it('correct header', () => {
        expect(package.nameOffset).to.equal(0x33FF5);
        expect(package.name).to.equal('arena');
        expect(package.unk1).to.equal(0);
        expect(package.unk2).to.equal(0);
        expect(package.unk3).to.equal(0x7F7FFFFF);
        expect(package.unk4).to.equal(0);
        expect(package.unk5).to.equal(0);
        expect(package.unk6).to.equal(0);
        expect(package.unk7).to.equal(0);
        expect(package.numberOfTextures).to.equal(0x27);
        expect(package.relativeTextureOffset).to.equal(0x6D);
        expect(package.textureOffset).to.equal(0x90);
        expect(package.unk8).to.equal(0x5);
        expect(package.unk9).to.equal(0x1B35);
        expect(package.unk10).to.equal(0x3D);
        expect(package.unk11).to.equal(0);
        expect(package.unk12).to.equal(0x1C19);
        expect(package.unk13).to.equal(0x50);
        expect(package.unk14).to.equal(0x5CA1);
        expect(package.numberOfModelParts).to.equal(0x50);
        expect(package.relativeModelPartsOffset).to.equal(0x2599);
        expect(package.modelPartsOffset).to.equal(0x25E0);
        expect(package.unk15).to.equal(0);
        expect(package.unk16).to.equal(0x8991);
    });

    it('correct textures', () => {
        expect(package.textures.length).to.equal(39);

        expect(package.textures[0].header.length).to.equal(0xB0);
        expect(package.textures[0].header.readUInt32BE(0xA4)).to.equal(0x1);
        expect(package.textures[0].data.length).to.equal(0xAB00);
        expect(package.textures[0].index).to.equal(0);

        expect(package.textures[15].header.readUInt32BE(0xA4)).to.equal(0x31F01)
        expect(package.textures[15].data.length).to.equal(0x5580);
        expect(package.textures[15].index).to.equal(15);
    });
});