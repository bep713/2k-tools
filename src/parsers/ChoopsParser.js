const Archive = require('../model/choops/Archive');
const FileParser = require('./FileParser');

class ChoopsParser extends FileParser {
    constructor() {
        super();

        this.archive = new Archive();
        this.bytes(0x18, this._onHeader);
    };

    _onHeader(buf) {
        this.archive.magic = buf.readUInt32BE();
        this.archive.alignment = buf.readUInt32BE();
        this.archive.numberOfArchives = buf.readUInt32BE();
        this.archive.zero = buf.readUInt32BE();
        this.archive.numberOfFiles = buf.readUInt32BE();
        this.archive.zero2 = buf.readUInt32BE();
    };
};

module.exports = ChoopsParser;