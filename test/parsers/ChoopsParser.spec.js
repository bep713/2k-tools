const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { pipeline } = require('stream');

const ChoopsParser = require('../../src/parsers/ChoopsParser');

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

let parser = new ChoopsParser();

describe('ChoopsParser unit tests', () => {
    before(async () => {
        parser = new ChoopsParser();

        await new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0A')),
                parser,
                (err) => {
                    if (err) { reject(err); }
                    resolve();
                }
            );
        });
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
});