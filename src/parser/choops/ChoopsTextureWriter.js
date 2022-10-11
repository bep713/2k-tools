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

        const oldRemap = file.dataBlocks[0].data.readUInt16BE(0x9);

        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x4C);
        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x50);
        file.dataBlocks[0].data.writeUInt32BE(0x0, 0x54);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x18), 0x58);
        file.dataBlocks[0].data.writeUInt32BE(oldRemap, 0x5C);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x20), 0x60);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x24), 0x64);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x28), 0x68);
        file.dataBlocks[0].data.writeUInt32BE(gtfData.readUInt32BE(0x2C), 0x6C);
        file.dataBlocks[0].isChanged = true;

        const offsetToTexture = gtfData.readUInt32BE(0x10);

        file.dataBlocks[1].length = gtfData.length - offsetToTexture;
        file.dataBlocks[1].data = gtfData.slice(offsetToTexture);
        file.dataBlocks[1].isChanged = true;
        
        file.isChanged = true;
    };

    async toFileFromDDSPath(ddsPath, file) {
        try {
            const tempGtfFileName = await this.toGtfFromDDS(ddsPath, file.name)
            const gtfData = await fs.readFile(tempGtfFileName);
    
            try {
                fs.rm(tempGtfFileName);
            }
            catch (err) {
                console.error(err);
            }
    
            return this.toFileFromGtf(gtfData, file);
        }
        catch (err) {
            console.error(err);
            return null;
        }
    };

    async toPackageFileFromGtf(gtfData, packageFile) {
        if (!packageFile.header || !packageFile.data) throw new Error('Package file is missing header and/or data.');

        const oldRemap = packageFile.header.readUInt16BE(0x9);

        packageFile.header.writeUInt32BE(0x0, 0x4C);
        packageFile.header.writeUInt32BE(0x0, 0x50);
        packageFile.header.writeUInt32BE(0x0, 0x54);
        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x18), 0x58);
        packageFile.header.writeUInt32BE(oldRemap, 0x5C);
        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x20), 0x60);
        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x24), 0x64);
        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x28), 0x68);
        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x2C), 0x6C);

        packageFile.header.writeUInt32BE(gtfData.readUInt32BE(0x20), 0x90);
        // file.dataBlocks[0].isChanged = true;

        const offsetToTexture = gtfData.readUInt32BE(0x10);

        // file.dataBlocks[1].length = gtfData.length - offsetToTexture;
        packageFile.data = gtfData.slice(offsetToTexture);
        // file.dataBlocks[1].isChanged = true;
        
        // file.isChanged = true;
    };

    async toPackageFileFromDDSPath(ddsPath, packageFile) {
        try {
            const tempGtfFileName = await this.toGtfFromDDS(ddsPath, packageFile.name)
            const gtfData = await fs.readFile(tempGtfFileName);
    
            try {
                fs.rm(tempGtfFileName);
            }
            catch (err) {
                console.error(err);
            }
    
            return this.toPackageFileFromGtf(gtfData, packageFile);
        }
        catch (err) {
            console.error(err);
            return null;
        }
    };

    toGtfFromDDS(ddsPath, name) {
        return new Promise(async (resolve, reject) => {
            const guid = uuid();
            const envPath = await envPathUtil.getEnvPath();

            const fileNameFormatted = `${guid}_${name}`;
            const tempDdsFileName = ddsPath;
            const tempGtfFileName = path.join(envPath.temp, `${fileNameFormatted}.gtf`);

            const pathToGtfExe = process.pkg ? 'dds2gtf.exe' : path.join(__dirname, '../../../lib/dds2gtf.exe');
            exec(`${pathToGtfExe} -v -z -o "${tempGtfFileName}" "${tempDdsFileName}"`, async (err, out, stderr) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                else {
                    resolve(tempGtfFileName);
                }
            });
        });
    };
};

module.exports = ChoopsTextureWriter;