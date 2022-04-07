const fs = require('fs');
const path = require('path');
const { pipeline } = require('../src/parser/IFFWriter');

const IFFWriter = require('../src/parser/IFFWriter');
const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureWriter = require('../src/parser/choops/ChoopsTextureWriter');

const IFF_NAME_TO_REPLACE = 'ux011.iff';
const IFF_SUBFILE_NAME = 'logo';
const IFF_OUTPUT_PATH = path.join(__dirname, 'output/output.iff');
const PATH_TO_DDS = 'D:\\GameRips\\CHoops2k8\\full-rip\\1376\\alt_logo.dds';
const PATH_TO_GAME_FILES = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

(async () => {
    const controller = new ChoopsController(PATH_TO_GAME_FILES);
    await controller.read();

    const cacheEntry = controller.getEntryByName(IFF_NAME_TO_REPLACE);
    const iffController = await controller.getFileController(IFF_NAME_TO_REPLACE);
    const iffSubFile = await iffController.getFile(IFF_SUBFILE_NAME);
    
    const textureWriter = new ChoopsTextureWriter();
    await textureWriter.toFileFromDDSPath(PATH_TO_DDS, iffSubFile);

    await new Promise((resolve, reject) => {
        pipeline(
            new IFFWriter(iffController.file),
            fs.createWriteStream(IFF_OUTPUT_PATH),
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });

    console.log(`NameHash=${cacheEntry.nameHash.toString(16).padStart(8, '0')}, ArchiveIndex=${cacheEntry.location}, Offset=${cacheEntry.offset.toString(16).padStart(8, '0')}`);
})();