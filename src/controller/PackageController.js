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
};

module.exports = PackageController;