const fs = require('fs');
const path = require('path');

const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureWriter = require('../src/parser/choops/ChoopsTextureWriter');

const PATH_TO_GAME_FILES = 'D:\\Games\\RPCS3\\rpcs3-v0.0.11-10661-182b20c3_win64\\dev_hdd0\\disc\\College Hoops 2K8 [U] [BLUS-30078]\\PS3_GAME\\USRDIR';

(async () => {
    const controller = new ChoopsController(PATH_TO_GAME_FILES);
    await controller.read({
        buildCache: false
    });

    let fileToModify = await controller.getFileController('loading.iff');
    let ablLogo = await fileToModify.getFile('abl_logo2');

    let fileToModify2 = await controller.getFileController('uh080.iff');
    let unifbump = await fileToModify2.getFile('unifbump');

    // await controller.revert('loading.iff');
    // await controller.revert('uh080.iff');

    const textureWriter = new ChoopsTextureWriter();
    await textureWriter.toFileFromDDSPath(path.join(__dirname, '../test/data/dds/abl_logo.dds'), ablLogo);
    await textureWriter.toFileFromDDSPath(path.join(__dirname, '../test/data/dds/abl_logo.dds'), unifbump);

    await controller.repack();
})();