const Package = require('../model/general/iff/Package');

class PackageController {
    constructor(packageFile) {
        if (packageFile) {
            this.file = packageFile;
        }
        else {
            this.file = new Package();
        }
    };

    getTextureByName(name) {
        return this.file.textures.find((file) => {
            return file.name === name;
        });
    };
};

module.exports = PackageController;