const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const PackageReader = require('../../src/parser/PackageReader');

const PATH_TO_PACKAGE = path.join(__dirname, '../data/scne/arena-without-tool-wrap.SCNE');
const PATH_TO_PACKAGE_AFTER_IMPORT = path.join(__dirname, '../data/scne/scne_after_1_texture_import.SCNE');
const PATH_TO_PACKAGE_AFTER_MULTIIMPORT = path.join(__dirname, '../data/scne/scne_after_multiple_imports.SCNE');

describe('Package Reader tests', () => {
    let reader, package, emittedBlockData, emittedFileData;

    describe('no changes', () => {
        before(async () => {
            emittedBlockData = [];
            emittedFileData = [];
    
            reader = new PackageReader({
                headerBlockSize: 0x34000,
                dataSize: 0x357500
            });
    
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
            expect(package.textures[0].preData).to.equal(null);
            expect(package.textures[0].index).to.equal(0);
            expect(package.textures[0].dataIndex).to.equal(0);
    
            expect(package.textures[15].header.readUInt32BE(0xA4)).to.equal(0x31F01)
            expect(package.textures[15].data.length).to.equal(0x5580);
            expect(package.textures[15].preData).to.equal(null);
            expect(package.textures[15].index).to.equal(15);
            expect(package.textures[15].dataIndex).to.equal(15);
        });
    
        it('expected buffers', () => {
            expect(package.bufs.headerTrailer.length).to.equal(0x3C);
            expect(package.bufs.postTextureHeaders.length).to.equal(0x32494);
            expect(package.bufs.postPackageName).to.be.null;
            expect(package.bufs.postTextureData).to.be.null;
        });
    });

    describe('after import', () => {
        // after texture import, the texture offsets won't be in order
        before(async () => {
            emittedBlockData = [];
            emittedFileData = [];
    
            reader = new PackageReader({
                headerBlockSize: 0x8000,
                dataSize: 0x6E100
            });
    
            reader.on('block-data', (data) => {
                emittedBlockData.push(data);
            });
    
            reader.on('file-data', (data) => {
                emittedFileData.push(data);
            });
    
            await new Promise((resolve, reject) => {
                pipeline(
                    fs.createReadStream(PATH_TO_PACKAGE_AFTER_IMPORT),
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
            expect(package.nameOffset).to.equal(0x7FB9);
            expect(package.name).to.equal('titlebar');
            expect(package.unk1).to.equal(0);
            expect(package.unk2).to.equal(0);
            expect(package.unk3).to.equal(0x3D2AAAAB);
            expect(package.unk4).to.equal(0x40AD5555);
            expect(package.unk5).to.equal(0);
            expect(package.unk6).to.equal(0x6);
            expect(package.unk7).to.equal(0x6D);
            expect(package.numberOfTextures).to.equal(0x3);
            expect(package.relativeTextureOffset).to.equal(0x10D);
            expect(package.textureOffset).to.equal(0x130);
            expect(package.unk8).to.equal(0x1);
            expect(package.unk9).to.equal(0x315);
            expect(package.unk10).to.equal(0x7);
            expect(package.unk11).to.equal(0);
            expect(package.unk12).to.equal(0x339);
            expect(package.unk13).to.equal(0x9);
            expect(package.unk14).to.equal(0xA81);
            expect(package.numberOfModelParts).to.equal(0x9);
            expect(package.relativeModelPartsOffset).to.equal(0x449);
            expect(package.modelPartsOffset).to.equal(0x490);
            expect(package.unk15).to.equal(0xF);
            expect(package.unk16).to.equal(0xF81);
        });
    
        it('correct textures', () => {
            expect(package.textures.length).to.equal(3);
    
            expect(package.textures[0].header.length).to.equal(0xB0);
            expect(package.textures[0].header.readUInt32BE(0xA4)).to.equal(0x46101);
            expect(package.textures[0].data.length).to.equal(0x20000);
            expect(package.textures[0].preData).to.equal(null);
            expect(package.textures[0].index).to.equal(0);
            expect(package.textures[0].dataIndex).to.equal(2);
    
            expect(package.textures[1].header.length).to.equal(0xB0);
            expect(package.textures[1].header.readUInt32BE(0xA4)).to.equal(0x2AB81);
            expect(package.textures[1].data.length).to.equal(0x5580);
            expect(package.textures[1].preData.length).to.equal(0x2AB80);
            expect(package.textures[1].index).to.equal(1);
            expect(package.textures[1].dataIndex).to.equal(0);
    
            expect(package.textures[2].header.length).to.equal(0xB0);
            expect(package.textures[2].header.readUInt32BE(0xA4)).to.equal(0x30101);
            expect(package.textures[0].preData).to.equal(null);
            expect(package.textures[2].data.length).to.equal(0x16000);
            expect(package.textures[2].index).to.equal(2);
            expect(package.textures[2].dataIndex).to.equal(1);
        });
    
        // need to update below assertions with correct data for this test case
        // it('expected buffers', () => {
        //     expect(package.bufs.headerTrailer.length).to.equal(0x3C);
        //     expect(package.bufs.postTextureHeaders.length).to.equal(0x32494);
        //     expect(package.bufs.postPackageName).to.be.null;
        //     expect(package.bufs.postTextureData).to.be.null;
        // });
    });

    // describe('after multi-import', () => {
    //     // after texture import, the texture offsets won't be in order
    //     before(async () => {
    //         emittedBlockData = [];
    //         emittedFileData = [];
    
    //         reader = new PackageReader({
    //             headerBlockSize: 0x8000,
    //             dataSize: 0x6E100
    //         });
    
    //         reader.on('block-data', (data) => {
    //             emittedBlockData.push(data);
    //         });
    
    //         reader.on('file-data', (data) => {
    //             emittedFileData.push(data);
    //         });
    
    //         await new Promise((resolve, reject) => {
    //             pipeline(
    //                 fs.createReadStream(PATH_TO_PACKAGE_AFTER_MULTIIMPORT),
    //                 reader,
    //                 (err) => {
    //                     if (err) { reject(err); }
    //                     else { resolve(); }
    //                 }
    //             );
    //         });
    
    //         package = reader.file;
    //     });
    
    //     it('correct header', () => {
    //         expect(package.nameOffset).to.equal(0x7FB9);
    //         expect(package.name).to.equal('titlebar');
    //         expect(package.unk1).to.equal(0);
    //         expect(package.unk2).to.equal(0);
    //         expect(package.unk3).to.equal(0x3D2AAAAB);
    //         expect(package.unk4).to.equal(0x40AD5555);
    //         expect(package.unk5).to.equal(0);
    //         expect(package.unk6).to.equal(0x6);
    //         expect(package.unk7).to.equal(0x6D);
    //         expect(package.numberOfTextures).to.equal(0x3);
    //         expect(package.relativeTextureOffset).to.equal(0x10D);
    //         expect(package.textureOffset).to.equal(0x130);
    //         expect(package.unk8).to.equal(0x1);
    //         expect(package.unk9).to.equal(0x315);
    //         expect(package.unk10).to.equal(0x7);
    //         expect(package.unk11).to.equal(0);
    //         expect(package.unk12).to.equal(0x339);
    //         expect(package.unk13).to.equal(0x9);
    //         expect(package.unk14).to.equal(0xA81);
    //         expect(package.numberOfModelParts).to.equal(0x9);
    //         expect(package.relativeModelPartsOffset).to.equal(0x449);
    //         expect(package.modelPartsOffset).to.equal(0x490);
    //         expect(package.unk15).to.equal(0xF);
    //         expect(package.unk16).to.equal(0xF81);
    //     });
    
    //     it('correct textures', () => {
    //         expect(package.textures.length).to.equal(3);
    
    //         expect(package.textures[0].header.length).to.equal(0xB0);
    //         expect(package.textures[0].header.readUInt32BE(0xA4)).to.equal(0x46101);
    //         expect(package.textures[0].data.length).to.equal(0x20000);
    //         expect(package.textures[0].preData).to.equal(null);
    //         expect(package.textures[0].index).to.equal(0);
    //         expect(package.textures[0].dataIndex).to.equal(2);
    
    //         expect(package.textures[1].header.length).to.equal(0xB0);
    //         expect(package.textures[1].header.readUInt32BE(0xA4)).to.equal(0x2AB81);
    //         expect(package.textures[1].data.length).to.equal(0x5580);
    //         expect(package.textures[1].preData.length).to.equal(0x2AB80);
    //         expect(package.textures[1].index).to.equal(1);
    //         expect(package.textures[1].dataIndex).to.equal(0);
    
    //         expect(package.textures[2].header.length).to.equal(0xB0);
    //         expect(package.textures[2].header.readUInt32BE(0xA4)).to.equal(0x30101);
    //         expect(package.textures[0].preData).to.equal(null);
    //         expect(package.textures[2].data.length).to.equal(0x16000);
    //         expect(package.textures[2].index).to.equal(2);
    //         expect(package.textures[2].dataIndex).to.equal(1);
    //     });
    
    //     // need to update below assertions with correct data for this test case
    //     // it('expected buffers', () => {
    //     //     expect(package.bufs.headerTrailer.length).to.equal(0x3C);
    //     //     expect(package.bufs.postTextureHeaders.length).to.equal(0x32494);
    //     //     expect(package.bufs.postPackageName).to.be.null;
    //     //     expect(package.bufs.postTextureData).to.be.null;
    //     // });
    // });
});