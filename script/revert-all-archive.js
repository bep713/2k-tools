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

    await controller.revertAll();
})();