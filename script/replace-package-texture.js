const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const IFFWriter = require('../src/parser/IFFWriter');
const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureWriter = require('../src/parser/choops/ChoopsTextureWriter');
const PackageWriter = require('../src/parser/PackageWriter');

const IFF_NAME_TO_REPLACE = 'global.iff';
const PACKAGE_NAME_TO_REPLACE = 'titlebar';
const SUBFILE_TO_REPLACE = 'texture_2';
const IFF_OUTPUT_PATH = path.join(__dirname, 'output/output.iff');
const SCNE_OUTPUT_PATH = path.join(__dirname, 'output/output.scne');
const PATH_TO_DDS = 'D:\\GameRips\\Choops2k8\\full-rip\\global\\titlebar\\texture_2 - Copy.dds';
const PATH_TO_GAME_FILES = 'D:\\Games\\RPCS3\\rpcs3-v0.0.11-10661-182b20c3_win64\\dev_hdd0\\disc\\College Hoops 2K8 [U] [BLUS-30078]\\PS3_GAME\\USRDIR';

(async () => {
    const controller = new ChoopsController(PATH_TO_GAME_FILES);
    await controller.read({
        buildCache: false
    });

    const cacheEntry = controller.getEntryByName(IFF_NAME_TO_REPLACE);
    const iffController = await controller.getFileController(IFF_NAME_TO_REPLACE);
    const packageController = await iffController.getFileController(PACKAGE_NAME_TO_REPLACE, 2);
    const packageFile = packageController.getTextureByName(SUBFILE_TO_REPLACE);
    
    const textureWriter = new ChoopsTextureWriter();
    await textureWriter.toPackageFileFromDDSPath(PATH_TO_DDS, packageFile);

    await new Promise((resolve, reject) => {
        pipeline(
            new IFFWriter(iffController.file).createStream(),
            fs.createWriteStream(IFF_OUTPUT_PATH),
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });

    await new Promise((resolve, reject) => {
        pipeline(
            new PackageWriter(packageController.file).createStream(),
            fs.createWriteStream(SCNE_OUTPUT_PATH),
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });

    console.log(`NameHash=${cacheEntry.nameHash.toString(16).padStart(8, '0')}, ArchiveIndex=${cacheEntry.location}, Offset=${cacheEntry.offset.toString(16).padStart(8, '0')}`);
})();