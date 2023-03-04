const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const { expect } = require('chai');
const { Writable } = require('stream');
const rewiremock = require('rewiremock/node');

// let fsPromisesStub = {
//     rename: sinon.spy(async () => {}),
//     writeFile: sinon.spy(async () => {})
// };

let fsStub = {
    constants: fs.constants,
    rm: sinon.spy((_1, cb) => { cb(); }),
    stat: sinon.spy(fs.stat),
    access: sinon.spy(fs.access),
    readdir: sinon.spy(fs.readdir),
    rename: sinon.spy((_1, _2, cb) => { cb(); }),
    writeFile: sinon.spy((_1, _2, cb) => { cb(); }),
    tempWriteStreamLength: 0,
    writeStreamLengths: [],
    createWriteStream: sinon.spy((name) => { 
        return new Writable({
            write: (chunk, enc, cb) => {
                fsStub.tempWriteStreamLength += chunk.length;
                cb();
            },
            final: (cb) => {
                fsStub.writeStreamLengths.push(fsStub.tempWriteStreamLength);
                fsStub.tempWriteStreamLength = 0;
                cb();
            }
        }); 
    })
};

const envPathUtilMock = {
    getEnvPath: async () => {
        return {
            config: path.join(__dirname, '../../data/cache')
        };
    }
};

const ChoopsTextureWriter = require('../../../src/parser/choops/ChoopsTextureWriter');

let cacheUtil = rewiremock.proxy(() => require('../../../src/util/cacheUtil'), {
    '../../../src/util/envPathUtil': envPathUtilMock
});

const ChoopsController = rewiremock.proxy(() => require('../../../src/controller/ChoopsController'), {
    '../../../src/util/cacheUtil': cacheUtil
});

let ChoopsArchiveWriter = rewiremock.proxy(() => require('../../../src/parser/choops/ChoopsArchiveWriter'), {
    'graceful-fs': fsStub
});

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);
let writer = new ChoopsArchiveWriter(controller);

describe('Choops Archive Writer tests', () => {
    describe('create mod structure', () => {
        before(async function () {
            this.timeout(60000);

            cacheUtil.CACHES.CHOOPS.cache = 'choops-original.cache';
    
            await controller.read({
                buildCache: false
            });

            cacheUtil.CACHES.CHOOPS.cache = 'choops-modified.cache';

            let fileToModify = await controller.getFileController('loading.iff');
            let ablLogo = await fileToModify.getFileController('abl_logo2');

            const textureWriter = new ChoopsTextureWriter();
            await textureWriter.toFileFromDDSPath(path.join(__dirname, '../../data/dds/abl_logo.dds'), ablLogo);

            // change a file in the same IFF to test if it will only change once
            let ncaaLogo = await fileToModify.getFileController('ncaa_logo');
            await textureWriter.toFileFromDDSPath(path.join(__dirname, '../../data/dds/abl_logo.dds'), ncaaLogo);

            // change a 2nd file
            const secondFileToModify = await controller.getFileController('loading_drillschallenge.iff');
            let attackBasket = await secondFileToModify.getFileController('attack_basket');
            await textureWriter.toFileFromDDSPath(path.join(__dirname, '../../data/dds/abl_logo.dds'), attackBasket);

            // change a 3rd file to test > 1GB scenario
            const thirdFileToModify = await controller.getFileController('s000.iff');
            let glossDetail = await thirdFileToModify.getFileController('floor_normalglossdetail');

            let bigBuffer = Buffer.alloc(0x40000000);
            glossDetail.dataBlocks[1].length = bigBuffer.length;
            glossDetail.dataBlocks[1].data = bigBuffer;
            glossDetail.dataBlocks[1].isChanged = true;

            writer = new ChoopsArchiveWriter(controller);
            await writer.write();
        });

        it('renames each archive up one letter', () => {
            expect(fsStub.rename.callCount).to.equal(5);

            expect(fsStub.rename.firstCall.args[0].slice(-1)).to.eql('E');
            expect(fsStub.rename.firstCall.args[1].slice(-1)).to.eql('F');

            expect(fsStub.rename.secondCall.args[0].slice(-1)).to.eql('D');
            expect(fsStub.rename.secondCall.args[1].slice(-1)).to.eql('E');

            expect(fsStub.rename.thirdCall.args[0].slice(-1)).to.eql('C');
            expect(fsStub.rename.thirdCall.args[1].slice(-1)).to.eql('D');

            expect(fsStub.rename.getCall(3).args[0].slice(-1)).to.eql('B');
            expect(fsStub.rename.getCall(3).args[1].slice(-1)).to.eql('C');
            
            expect(fsStub.rename.getCall(4).args[0].slice(-1)).to.eql('A');
            expect(fsStub.rename.getCall(4).args[1].slice(-1)).to.eql('B');
        });

        it('updates the controller cache', () => {
            expect(controller.cache.archiveCache.archives.length).to.equal(8);
            expect(controller.cache.archiveCache.numberOfArchives).to.equal(8);

            expect(controller.cache.archiveCache.archives[0].size).to.eql(0xD800n);
            expect(controller.cache.archiveCache.archives[1].size).to.eql(0x40000000n);
            expect(controller.cache.archiveCache.archives[2].size).to.eql(0x40000000n);
            expect(controller.cache.archiveCache.archives[3].size).to.eql(0x40000000n);
            expect(controller.cache.archiveCache.archives[4].size).to.eql(0x40000000n);
            expect(controller.cache.archiveCache.archives[5].size).to.eql(0x1EB58000n);

            expect(controller.cache.archiveCache.archives[6].name).to.eql('\u00000\u0000G\u0000\u0000\u0000\u0000');
            expect(controller.cache.archiveCache.archives[6].zero).to.eql(0);
            expect(controller.cache.archiveCache.archives[6].size).to.eql(0x40000000n);

            expect(controller.cache.archiveCache.archives[7].name).to.eql('\u00000\u0000H\u0000\u0000\u0000\u0000');
            expect(controller.cache.archiveCache.archives[7].zero).to.eql(0);
            expect(controller.cache.archiveCache.archives[7].size).to.eql(0xB15000n);
        });

        it('updates the TOC entries', () => {
            expect(controller.cache.archiveCache.toc[0].archiveIndex).to.equal(2);
            expect(controller.cache.archiveCache.toc[0].offset).to.equal(0x69BD4800);
            expect(controller.cache.archiveCache.toc[0].rawOffset).to.equal(0xD37A9);

            expect(controller.cache.tocCache[0].location).to.equal(6);
            // expect(controller.cache.tocCache[0].offset).to.equal(0x11EB65800);
            expect(controller.cache.tocCache[0].rawOffset).to.equal(0x23D6CB);
            expect(controller.cache.tocCache[0].size).to.equal(0x3C1BD0);

            expect(controller.cache.tocCache[0].original.location).to.equal(1);
            // expect(controller.cache.tocCache[0].original.offset).to.equal(0xD800);
            expect(controller.cache.tocCache[0].original.rawOffset).to.equal(0x36);
            expect(controller.cache.tocCache[0].original.size).to.equal(0x1594B6);

            expect(controller.cache.archiveCache.toc[1899].archiveIndex).to.equal(6);
            // expect(controller.cache.archiveCache.toc[1899].offset).to.equal(0x11EF27800);
            expect(controller.cache.archiveCache.toc[1899].rawOffset).to.equal(0x23DE4F);
            expect(controller.cache.archiveCache.toc[1899].size).to.equal(0x2C5FBA);

            const tocCacheEntry = controller.cache.tocCache.find((entry) => {
                return entry.id === 1899;
            });

            expect(tocCacheEntry.location).to.equal(6);
            // expect(tocCacheEntry.offset).to.equal(0x11EF27800);
            expect(tocCacheEntry.rawOffset).to.equal(0x23DE4F);
            expect(tocCacheEntry.size).to.equal(0x2C5FBA);
        });

        it('creates a blank 0G file', () => {
            expect(fsStub.writeFile.firstCall.args[0]).to.contain('0G');
            expect(fsStub.writeFile.firstCall.args[1].length).to.eql(0);
        });

        // because we added 1GB of data, we need another overflow file
        it('creates a blank 0H file', () => {
            expect(fsStub.writeFile.secondCall.args[0]).to.contain('0H');
            expect(fsStub.writeFile.secondCall.args[1].length).to.eql(0);
        });

        it('writes changed data to 0G (up to 1GB)', () => {
            expect(fsStub.createWriteStream.firstCall.args[0]).to.contain('0G');
            expect(fsStub.writeStreamLengths[0]).to.equal(0x40000000);
        });

        it('writes changed data to 0H', () => {
            expect(fsStub.createWriteStream.secondCall.args[0]).to.contain('0H');
            expect(fsStub.writeStreamLengths[1]).to.equal(0xB15000);
        });

        it('writes the TOC to 0A', () => {
            expect(fsStub.createWriteStream.thirdCall.args[0]).to.contain('0A');
            expect(fsStub.writeStreamLengths[2]).to.equal(0xD800);
        });

        describe('revert', () => {
            before(async () => {
                fsStub.stat = sinon.spy((_, cb) => { cb(null, { size: 0xD800 }); });
                fsStub.readdir = sinon.spy((_, cb) => { cb(null, ['0A', '0B', '0C', '0D', '0E', '0F', '0G', '0H', '0I', '0J', 'EBOOT.BIN'] ); });
                fsStub.rename.resetHistory();

                ChoopsArchiveWriter = rewiremock.proxy(() => require('../../../src/parser/choops/ChoopsArchiveWriter'), {
                    'graceful-fs': fsStub
                });

                writer = new ChoopsArchiveWriter(controller);
                await writer.revertAll();
            });

            it('calls rm function expected times', () => {
                expect(fsStub.rm.callCount).to.equal(5);    // 0A & 0G -> 0J should be removed

                expect(fsStub.rm.firstCall.args[0]).to.contain('0A');
                expect(fsStub.rm.secondCall.args[0]).to.contain('0G');
                expect(fsStub.rm.thirdCall.args[0]).to.contain('0H');
                expect(fsStub.rm.getCall(3).args[0]).to.contain('0I');
                expect(fsStub.rm.getCall(4).args[0]).to.contain('0J');
            });

            it('calls rename function expected times', () => {
                expect(fsStub.rename.callCount).to.equal(5);    // 0B -> 0F should be renamed

                expect(fsStub.rename.firstCall.args[0]).to.contain('0B');
                expect(fsStub.rename.secondCall.args[0]).to.contain('0C');
                expect(fsStub.rename.thirdCall.args[0]).to.contain('0D');
                expect(fsStub.rename.getCall(3).args[0]).to.contain('0E');
                expect(fsStub.rename.getCall(4).args[0]).to.contain('0F');
            });
        });

    });
});