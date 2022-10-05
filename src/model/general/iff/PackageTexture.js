const Texture = require('./Texture');

class PackageTexture extends Texture {
    constructor() {
        super();
        this.relativeDataOffset = 0;
        this.originalRelativeDataOffset = 0;    // represents the data offset in the SCNE file in the original game files.
    };
};

module.exports = PackageTexture;