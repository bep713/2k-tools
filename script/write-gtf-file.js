const fs = require('fs');
const path = require('path');

const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureReader = require('../src/parser/choops/ChoopsTextureReader');

const OUTPUT_PATH = path.join(__dirname, './output/gtf-output.gtf');
const PATH_TO_GAME_FILES = 'D:\\Games\\RPCS3\\rpcs3-v0.0.11-10661-182b20c3_win64\\dev_hdd0\\disc\\College Hoops 2K8 [U] [BLUS-30078]\\PS3_GAME\\USRDIR';

(async () => {
    let controller = new ChoopsController(PATH_TO_GAME_FILES);
    await controller.read();

    const osuHome = await controller.getFileController('ua036.iff');
    const osuBump = await osuHome.getFileController('jersey_numbers');
    
    const textureReader = new ChoopsTextureReader();
    const gtfData = await textureReader.toGTFFromFile(osuBump);

    fs.writeFileSync(OUTPUT_PATH, gtfData);
})();