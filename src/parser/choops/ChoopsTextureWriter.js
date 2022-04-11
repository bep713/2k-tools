const path = require('path');
const uuid = require('uuid').v4;
const fs = require('fs/promises');
const { exec } = require('child_process');

const envPathUtil = require('../../util/envPathUtil');

class ChoopsTextureWriter {
    constructor() {

    };

    async toFileFromGtf(gtfData, file) {
        if (file.dataBlocks.length < 2) throw new Error('File does not have expected number of data blocks.');

        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x4C);
        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x50);
        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x54);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x18), 0x58);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x1C), 0x5C);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x20), 0x60);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x24), 0x64);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x28), 0x68);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x2C), 0x6C);

        const offsetToTexture = gtfData.readUInt32BE(0x10);

        file.dataBlocks[1].length = gtfData.length - offsetToTexture;
        file.dataBlocks[1].data = gtfData.slice(offsetToTexture);
    };

    async toFileFromDDSPath(ddsPath, file) {
        return new Promise(async (resolve, reject) => {
            const guid = uuid();
            const envPath = await envPathUtil.getEnvPath();

            const fileNameFormatted = `${guid}_${file.name}`;
            const tempDdsFileName = ddsPath;
            const tempGtfFileName = path.join(envPath.temp, `${fileNameFormatted}.gtf`);

            const pathToGtfExe = process.pkg ? 'dds2gtf.exe' : path.join(__dirname, '../../../lib/dds2gtf.exe');
            exec(`${pathToGtfExe} -v -z -o ${tempGtfFileName} ${tempDdsFileName}`, async (err, out, stderr) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }

                console.log(out);

                const gtfData = await fs.readFile(tempGtfFileName);

                try {
                    fs.rm(tempGtfFileName);
                }
                catch (err) {
                    
                }

                resolve(this.toFileFromGtf(gtfData, file));
            });
        });
    };
};

module.exports = ChoopsTextureWriter;