const Package = require('../model/general/iff/Package');

class SCNEController {
    constructor(packageFile) {
        if (packageFile) {
            this.file = packageFile;
        }
        else {
            this.file = new Package();
        }
    };    
};

module.exports = SCNEController;