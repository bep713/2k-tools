const IFF = require('../model/general/iff/IFF');
const IFFType = require('../model/general/iff/IFFType');

class IFFController {
    constructor(iffFile) {
        if (iffFile) {
            this.file = iffFile;
        }
        else {
            this.file = new IFF();
        }
    };

    async getFileRawData(name) {
        if (!name) { throw new Error('getResourceRawData() takes in a mandatory `name` parameter.'); }
        if (this.file.files.length === 0) { throw new Error('The IFF file does not contain any subfiles to read.'); }

        const file = this.file.files.find((file) => {
            return file.name.toLowerCase() === name.toLowerCase()
                || file.name.toLowerCase() === name + '\0'.toLowerCase();
        });

        return file;
    };

    async getFile(name) {
        const file = this.getFileRawData(name);

        switch(file.type) {
            case IFFType.TYPES.TXTR:
                console.log('here');
                break;
        }

        return file;
    };

    async getAllFilesByIFFType(type) {
        return this.file.files.filter((file) => {
            return file.type === type;
        });
    };
};

module.exports = IFFController;