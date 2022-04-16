const sinon = require('sinon');
const { expect } = require('chai');
const { Writable } = require('stream');
const rewiremock = require('rewiremock/node');


let fsPromisesStub = {
    rename: sinon.spy(async () => {}),
    writeFile: sinon.spy(async () => {})
};

let fsStub = {
    tempWriteStreamLength: 0,
    writeStreamLengths: [],
    createWriteStream: sinon.spy(() => { 
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

const ChoopsController = require('../../../src/controller/ChoopsController');
const ChoopsArchiveWriter = rewiremock.proxy(() => require('../../../src/parser/choops/ChoopsArchiveWriter'), {
    'fs': fsStub,
    'fs/promises': fsPromisesStub
});

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

let writer = new ChoopsArchiveWriter(PATH_TO_CHOOPS_ARCHIVE_FOLDER);
let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

describe('Choops Archive Writer tests', () => {
    describe('create mod structure', () => {
        before(async function () {
            this.timeout(60000);
    
            await controller.read({
                buildCache: false
            });

            writer = new ChoopsArchiveWriter(PATH_TO_CHOOPS_ARCHIVE_FOLDER, controller.cache);
    
            await writer.write();
        });

        it('renames each archive up one letter', () => {
            expect(fsPromisesStub.rename.callCount).to.equal(5);

            expect(fsPromisesStub.rename.firstCall.args[0].slice(-1)).to.eql('E');
            expect(fsPromisesStub.rename.firstCall.args[1].slice(-1)).to.eql('F');

            expect(fsPromisesStub.rename.secondCall.args[0].slice(-1)).to.eql('D');
            expect(fsPromisesStub.rename.secondCall.args[1].slice(-1)).to.eql('E');

            expect(fsPromisesStub.rename.thirdCall.args[0].slice(-1)).to.eql('C');
            expect(fsPromisesStub.rename.thirdCall.args[1].slice(-1)).to.eql('D');

            expect(fsPromisesStub.rename.getCall(3).args[0].slice(-1)).to.eql('B');
            expect(fsPromisesStub.rename.getCall(3).args[1].slice(-1)).to.eql('C');
            
            expect(fsPromisesStub.rename.getCall(4).args[0].slice(-1)).to.eql('A');
            expect(fsPromisesStub.rename.getCall(4).args[1].slice(-1)).to.eql('B');
        });

        it('updates the controller cache', () => {
            expect(controller.cache.archiveCache.archives.length).to.equal(7);
            expect(controller.cache.archiveCache.numberOfArchives).to.equal(7);

            expect(controller.cache.archiveCache.archives[0].size).to.eql(0xD800);
            expect(controller.cache.archiveCache.archives[1].size).to.eql(0x40000000);
            expect(controller.cache.archiveCache.archives[2].size).to.eql(0x40000000);
            expect(controller.cache.archiveCache.archives[3].size).to.eql(0x40000000);
            expect(controller.cache.archiveCache.archives[4].size).to.eql(0x40000000);
            expect(controller.cache.archiveCache.archives[5].size).to.eql(0x1EB58000);

            expect(controller.cache.archiveCache.archives[6].name).to.eql('\u00000\u0000G\u0000\u0000\u0000\u0000');
            expect(controller.cache.archiveCache.archives[6].zero).to.eql(0);
            expect(controller.cache.archiveCache.archives[6].size).to.eql(0);
        });

        it('updates the TOC entries', () => {
            expect(controller.cache.archiveCache.toc[0].archiveIndex).to.equal(2);
            expect(controller.cache.archiveCache.toc[0].offset).to.equal(0x69BD4800);
            expect(controller.cache.archiveCache.toc[0].rawOffset).to.equal(0xD37A9);

            expect(controller.cache.tocCache[0].location).to.equal(1);
            expect(controller.cache.tocCache[0].offset).to.equal(0x1B000);
            expect(controller.cache.tocCache[0].rawOffset).to.equal(0x36);

            expect(controller.cache.tocCache[0].original.location).to.equal(0);
            expect(controller.cache.tocCache[0].original.offset).to.equal(0xD800);
            expect(controller.cache.tocCache[0].original.rawOffset).to.equal(0x1B);
        });

        it('writes the TOC to 0A', () => {
            expect(fsStub.createWriteStream.firstCall.args[0]).to.contain('0A');
            expect(fsStub.writeStreamLengths[0]).to.equal(0xD800);
        });

        it('creates a blank 0G file', () => {
            expect(fsPromisesStub.writeFile.firstCall.args[0]).to.contain('0G');
            expect(fsPromisesStub.writeFile.firstCall.args[1].length).to.eql(0);
        });
    });
});