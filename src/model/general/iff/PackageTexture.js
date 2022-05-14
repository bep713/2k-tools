const Texture = require('./Texture');

class PackageTexture extends Texture {
    constructor() {
        super();
        this.relativeDataOffset = 0;
    };
};

module.exports = PackageTexture;