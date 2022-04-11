const path = require('path');
const uuid = require('uuid').v4;
const fs = require('fs/promises');
const { exec } = require('child_process');

const envPathUtil = require('../../util/envPathUtil');

class ChoopsTextureReader {
    constructor() {
        
    };

    async toGTFFromFile(file) {
        if (file.dataBlocks.length < 2) { return null; }
        const textureGtfHeader = file.dataBlocks[0].data.slice(0x58, 0x70);

        let gtfHeader = Buffer.alloc(0x30);

        // file header
        gtfHeader.writeUInt32BE(0x01080000, 0x0);
        gtfHeader.writeUInt32BE(file.dataBlocks[1].data.length + 0x30, 0x4);
        gtfHeader.writeUInt32BE(0x1, 0x8);

        // texture header
        gtfHeader.writeUInt32BE(0x0, 0xC);
        gtfHeader.writeUInt32BE(0x30, 0x10);
        gtfHeader.writeUInt32BE(file.dataBlocks[1].data.length, 0x14);
        gtfHeader.fill(textureGtfHeader, 0x18);

        return Buffer.concat([gtfHeader, file.dataBlocks[1].data]);
    };

    async toDDSFromFile(file) {
        return new Promise(async (resolve, reject) => {
            const gtfBuffer = await this.toGTFFromFile(file);

            if (!gtfBuffer) {
                resolve(null);
            }
            else {
                const guid = uuid();
                const envPath = await envPathUtil.getEnvPath();
    
                const fileNameFormatted = `${guid}_${file.name}`;
                const tempGtfFileName = path.join(envPath.temp, `${fileNameFormatted}.gtf`);
                const tempDdsFileName = path.join(envPath.temp, `${fileNameFormatted}.dds`);
    
                await fs.writeFile(tempGtfFileName, gtfBuffer);
    
                const pathToGtfExe = process.pkg ? 'gtf2dds.exe' : path.join(__dirname, '../../../lib/gtf2dds.exe');
                exec(`${pathToGtfExe} -v -z -o ${tempDdsFileName} ${tempGtfFileName}`, async (err, out, stderr) => {
                    if (err) {
                        reject(err);
                    }

                    console.log(out);
    
                    const ddsData = await fs.readFile(tempDdsFileName);
    
                    try {
                        fs.rm(tempGtfFileName);
                        fs.rm(tempDdsFileName);
                    }
                    catch (err) {
                        
                    }
    
                    resolve(ddsData);
                });
            }
        });
    };
};

module.exports = ChoopsTextureReader;