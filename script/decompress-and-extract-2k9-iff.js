const fsBase = require('fs');
const path = require('path');
const fs = require('fs/promises');
const mkdir = require('make-dir');
const MultiStream = require('multistream');
const { pipeline, Readable } = require('stream');

const hashUtil = require('../src/util/2kHashUtil');
const IFFReader = require('../src/parser/IFFReader');
const IFFWriter = require('../src/parser/IFFWriter');
const EndianUtil = require('../src/util/endianUtil');
const IFFType = require('../src/model/general/iff/IFFType');
const ChoopsTextureReader = require('../src/parser/choops/ChoopsTextureReader');

const INPUT_FILE_PATH = 'D:\\GameRips\\NBA 2K9\\titlepage.iff';
const OUTPUT_FILE_PATH = 'D:\\GameRips\\NBA 2K9\\rips\\titlepage';

(async () => {
    const textureReader = new ChoopsTextureReader();

    let controller = await new Promise((resolve, reject) => {
        const parser = new IFFReader({
            endian: EndianUtil.LITTLE
        });

        let pendingFilePromises = [];

        parser.on('file-data', (file) => {
            pendingFilePromises.push((async () => {
                if (file.type === IFFType.TYPES.UNKNOWN && file.typeRaw) {
                    // if the file doesn't have the name definition, try to find and set the
                    // file type here based on the type hash in the IFF header.
                    const type = await hashUtil.hashLookup(file.typeRaw);
                    
                    if (type) {
                        file.type = IFFType.stringToType(type.str);
                    }
                }
            })());
        });

        pipeline(
            fsBase.createReadStream(INPUT_FILE_PATH),
            parser,
            async (err) => {
                if (err) reject(err);
                else {
                    await Promise.all(pendingFilePromises);
                    resolve(parser.controller);
                }
            }
        )
    });

    try {
        const writer = new IFFWriter(controller.file);
                
        await new Promise((resolve, reject) => {
            pipeline(
                writer.createStream(),
                fsBase.createWriteStream(path.join(OUTPUT_FILE_PATH, path.basename(INPUT_FILE_PATH))),
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        for (const file of controller.file.files) {
            const fileType = IFFType.typeToString(file.type).toLowerCase();
            const subfolderName = path.join(OUTPUT_FILE_PATH, `_${file.name}.${fileType}`);
            // const textureFolderName = path.join(subfolderName, 'textures');
            await mkdir(subfolderName);

            outputRawType();

            // if (!options.rawType) {
                // if (file.type === IFFType.TYPES.TXTR) {
                //     const fileDds = await textureReader.toDDSFromFile(file);
                //     if (fileDds) {
                //         await fs.writeFile(path.join(subfolderName, `${file.name}.dds`), fileDds);
                //     }
                // }
                // else if (file.type === IFFType.TYPES.SCNE) {
                //     const packageController = await controller.getFileController(file.name, IFFType.TYPES.SCNE);
                //     // const scneFolderName = path.join(folderName, file.name);

                //     // if (packageController.file.textures.length > 0) {
                //     //     await mkdir(textureFolderName);
                //     // }

                //     for (const texture of packageController.file.textures) {
                //         const fileDds = await textureReader.toDDSFromTexture(texture);
                //         if (fileDds) {
                //             await fs.writeFile(path.join(subfolderName, `${texture.name}.dds`), fileDds);
                //         }
                //     }
                // }
                // else {
                    // outputRawType();
                // }
            // }
            // else {
                // outputRawType();
            // }

            async function outputRawType() {
                let toolWrapperBuf = Buffer.alloc(0xC + (file.dataBlocks.length * 4));
                toolWrapperBuf.writeUInt32BE(0x326B546C, 0x0);
                toolWrapperBuf.writeUInt32BE(toolWrapperBuf.length, 0x4);
                toolWrapperBuf.writeUInt16BE(file.type, 0x8);
                toolWrapperBuf.writeUInt16BE(file.dataBlocks.length, 0xA);
                
                file.dataBlocks.forEach((dataBlock, index) => {
                    toolWrapperBuf.writeUInt32BE(dataBlock.data.length, 0xC + (index * 4));
                });

                let fileDataBlocks = file.dataBlocks.map((block) => {
                    return block.data;
                });

                fileDataBlocks.unshift(toolWrapperBuf); // add tool wrapper header to beginning

                await fs.writeFile(path.join(OUTPUT_FILE_PATH, `${file.name}.${fileType}`), Buffer.concat(fileDataBlocks));
            }
        }
    }
    catch (err) {
        console.error(err);
    }
})();