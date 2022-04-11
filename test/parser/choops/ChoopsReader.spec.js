const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');
const Multistream = require('multistream');

const ChoopsReader = require('../../../src/parser/choops/ChoopsReader');

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

let parser = new ChoopsReader();
let chunks = [];

describe('ChoopsParser unit tests', () => {
    before(async function () {
        this.timeout(60000);

        parser = new ChoopsReader({
            emitData: false
        });

        parser.on('chunk', (meta) => {
            chunks.push(meta);
        });

        parser.on('progress', (message) => {
            console.log(message.message);
        });

        await parseArchive(parser);
    });

    it('expected header information', () => {
        const archive = parser.archive;

        expect(archive.magic).to.equal(0xAA00B3BF);
        expect(archive.alignment).to.equal(0x800);
        expect(archive.numberOfArchives).to.equal(5);
        expect(archive.zero).to.equal(0);
        expect(archive.numberOfFiles).to.equal(3376);
        expect(archive.zero2).to.equal(0);
    });

    it('expected archive header information', () => {
        const archive = parser.archive;

        expect(archive.archives.length).to.equal(5);
        
        const firstArchive = archive.archives[0];
        expect(firstArchive.sizeRaw).to.equal(0x80000);
        expect(firstArchive.size).to.equal(1073741824);
        expect(firstArchive.zero).to.equal(0);
        expect(firstArchive.name).to.equal('\u00000\u0000A\u0000\u0000\u0000\u0000');

        expect(archive.archives[4].sizeRaw).to.equal(0x3D6B0);
        expect(archive.archives[4].size).to.equal(515211264);
        expect(archive.archives[4].name).to.equal('\u00000\u0000E\u0000\u0000\u0000\u0000');
    });

    it('builds and sorts TOC', () => {
        const toc = parser.archive.toc;
        expect(toc.length).to.equal(3376);

        const firstToc = toc[0];
        expect(firstToc.nameHash).to.equal(0xB4720031);
        expect(firstToc.name).to.equal('loading.iff');
        expect(firstToc.rawOffset).to.equal(0x1B);
        expect(firstToc.offset).to.equal(0xD800);
        expect(firstToc.zero).to.equal(0x0);
        expect(firstToc.size).to.equal(0x1594B6);
        expect(firstToc.archiveIndex).to.equal(0);
        expect(firstToc.archiveOffset).to.equal(0xD800);
        expect(firstToc.isSplit).to.equal(false);
        expect(firstToc.splitSecondFileSize).to.equal(0);

        const toc400 = toc[400];
        expect(toc400.nameHash).to.equal(0x361636C3);
        expect(toc400.name).to.equal('711');
        expect(toc400.rawOffset).to.equal(0xD3691);
        expect(toc400.offset).to.equal(0x69B48800)
        expect(toc400.zero).to.equal(0x0);
        expect(toc400.size).to.equal(0x30);
        expect(toc400.archiveIndex).to.equal(1);
        expect(toc400.archiveOffset).to.equal(0x29B48800);
        expect(toc400.isSplit).to.equal(false);
        expect(toc400.splitSecondFileSize).to.equal(0);

        const global = toc.find((theToc) => {
            return theToc.name === 'global.iff';
        });

        expect(global.archiveIndex).to.equal(0);
        expect(global.archiveOffset).to.equal(0x3EEAE800);
        expect(global.isSplit).to.equal(true);
        expect(global.splitSecondFileSize).to.equal(0xD9C111);

        const lastToc = toc[3375];
        expect(lastToc.nameHash).to.equal(0xEA4B7257);
        expect(lastToc.name).to.equal('weeklyshow.iff');
        expect(lastToc.rawOffset).to.equal(0x23D57E);
        expect(lastToc.offset).to.equal(0x11EABF000);
        expect(lastToc.zero).to.equal(0x0);
        expect(lastToc.size).to.equal(0x988B4);
        expect(lastToc.archiveIndex).to.equal(4);
        expect(lastToc.archiveOffset).to.equal(0x1EABF000);
        expect(lastToc.isSplit).to.equal(false);
        expect(lastToc.splitSecondFileSize).to.equal(0);
    });

    describe('emits chunks', () => {
        it('emits an event for each data chunk', () => {
            expect(chunks.length).to.equal(parser.archive.numberOfFiles);
        });
    
        it('event contains correct information', () => {
            expect(chunks[1000]).to.eql({
                meta: {
                    archiveIndex: 2,
                    archiveOffset: 741128192,
                    offset: 2888611840,
                    rawOffset: 1410455,
                    size: 2925604,
                    nameHash: 1569367355,
                    zero: 0,
                    isSplit: false,
                    splitSecondFileSize: 0,
                    name: '1229',
                    id: 1229
                }
            });
        });

        it('emits the data if option is passed in', async function() {
            this.timeout(30000);

            let parser2 = new ChoopsReader({
                emitData: true
            });

            let numDataEmits = 0;
    
            parser2.on('chunk', (meta) => {
                if (meta.data) {
                    numDataEmits += 1;
                }
            });
    
            parser2.on('progress', (message) => {
                console.log(message.message);
            });

            await parseArchive(parser2);

            expect(numDataEmits).to.equal(parser2.archive.numberOfFiles);
        });
    });

    it('does not emit chunks if stopAfterToc is passed in', async function () {
        this.timeout(30000);

        let parser2 = new ChoopsReader({
            stopAfterToc: true
        });

        let numEmits = 0;

        parser2.on('chunk', (meta) => {
            numEmits += 1;
        });

        await parseArchive(parser2);
        expect(numEmits).to.equal(0);
    });

    it('can extract a specific data chunk offset', async function () {
        this.timeout(30000);

        const offsetsToExtract = [11274240, 2888611840];

        let parser2 = new ChoopsReader({
            offsetsToExtract: offsetsToExtract
        });

        let numEmits = 0;

        parser2.on('chunk', (meta) => {
            if (offsetsToExtract.indexOf(meta.meta.offset) >= 0) {
                numEmits += 1;
            }
        });

        await parseArchive(parser2);
        expect(numEmits).to.equal(2);
    });
});

async function parseArchive(parser) {
    await new Promise((resolve, reject) => {
        pipeline(
            new Multistream([
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0A')),
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0B')),
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0C')),
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0D')),
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0E')),
            ]),
            parser,
            (err) => {
                if (err) { reject(err); }
                resolve();
            }
        );
    });
};