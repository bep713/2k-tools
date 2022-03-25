const path = require('path');
const { expect } = require('chai');
const gameFileUtil = require('../../../src/util/choops/choopsGameFileUtil');

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

describe('choops game file util unit tests', () => {
    it('returns expected paths', async () => {
        const paths = await gameFileUtil.getGameFilePaths(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        expect(paths.length).to.equal(5);
        expect(paths[0]).to.eql(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0A'));
        expect(paths[1]).to.eql(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0B'));
        expect(paths[2]).to.eql(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0C'));
        expect(paths[3]).to.eql(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0D'));
        expect(paths[4]).to.eql(path.join(PATH_TO_CHOOPS_ARCHIVE_FOLDER, '0E'));
    });
});