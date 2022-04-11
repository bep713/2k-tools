const fs = require('fs');
const path = require('path');
const { pipeline } = require('../src/parser/IFFWriter');

const IFFWriter = require('../src/parser/IFFWriter');
const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureWriter = require('../src/parser/choops/ChoopsTextureWriter');

const IFF_NAME_TO_REPLACE = 'uh080.iff';
const IFF_SUBFILE_NAMES = ['unifregion', 'unifbump', 'shortregion', 'shortbump'];
const IFF_OUTPUT_PATH = path.join(__dirname, 'output/output.iff');
const PATH_TO_DDS = ['C:\\GameRips\\Choops\\uh080\\Test_Jersey.dds', 'C:\\GameRips\\Choops\\uh080\\Test-Bump-Jersey.dds', 
    'C:\\GameRips\\Choops\\uh080\\Test_Shorts.dds', 'C:\\GameRips\\Choops\\uh080\\Test-Bump-Shorts.dds'];
const PATH_TO_GAME_FILES = 'C:\\Users\\Public\\Public Games\\College Hoops 2K8 [U] [BLUS-30078]\\PS3_GAME\\USRDIR';

(async () => {
    const controller = new ChoopsController(PATH_TO_GAME_FILES);
    await controller.read({
        buildCache: false
    });

    const cacheEntry = controller.getEntryByName(IFF_NAME_TO_REPLACE);
    const iffController = await controller.getFileController(IFF_NAME_TO_REPLACE);

    const textureWriter = new ChoopsTextureWriter();

    await Promise.all(IFF_SUBFILE_NAMES.map(async (subfile, index) => {
        const iffSubFile = await iffController.getFile(subfile);
        await textureWriter.toFileFromDDSPath(PATH_TO_DDS[index], iffSubFile);
    }));

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