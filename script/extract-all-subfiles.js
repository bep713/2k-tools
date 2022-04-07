const fs = require('fs/promises');
const path = require('path');
const mkdir = require('make-dir');

const IFFType = require('../src/model/general/iff/IFFType');
const ChoopsController = require('../src/controller/ChoopsController');
const ChoopsTextureReader = require('../src/parser/choops/ChoopsTextureReader');

const hashUtil = require('../src/util/2kHashUtil');

let done = false;
const iffName = 'gumbel.iff';
const PATH_TO_OUTPUT = 'D:\\GameRips\\CHoops2k8\\textures';

checkDone();

function checkDone() {
    if (!done) {
        return setTimeout(checkDone, 100);
    }
    else {
        
    }
}

(async () => {
    await hashUtil.hashLookupPromise;
    const controller = new ChoopsController('D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR');

    controller.on('progress', (data) => {
        console.log(data.message);
    });

    await controller.read({
        buildCache: true
    });

    const textureReader = new ChoopsTextureReader();

    let counter = 0;

    for (const iffData of controller.data) {
        console.log(`${counter} - ${iffData.name} (${iffData.nameHash.toString(16)}, ${iffData.location}, ${iffData.offset.toString(16)})`);

        const iff = await controller.getFileController(iffData.name);

        if (!(iff instanceof Buffer)) {        
            const iffDataName = iffData.name.indexOf('.') >= 0 ? iffData.name.slice(0, iffData.name.length - 4) : iffData.name;
            const folderName = path.join(PATH_TO_OUTPUT, iffDataName);
            await mkdir(folderName);

            try {
                for (const file of iff.file.files) {
                    if (file.type === IFFType.TYPES.TXTR) {
                        const fileDds = await textureReader.toDDSFromFile(file);
                        if (fileDds) {
                            await fs.writeFile(path.join(folderName, `${file.name}.dds`), fileDds);
                        }
                    }
                    else {
                        let fileData = Buffer.concat(file.dataBlocks.map((block) => {
                            return block.data;
                        }));

                        await fs.writeFile(path.join(folderName, `${file.name}.${IFFType.typeToString(file.type)}`), fileData);
                    }
                }
            }
            catch (err) {
                console.log(err);
            }
        }
        else {
            console.log(`CDF file: ${iffData.name}`);
        }

        counter += 1;
    }

    done = true;

})();