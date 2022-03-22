const ArchiveTOC = require("./ArchiveTOC");

class Archive {
    constructor() {
        this.magic = 0;
        this.alignment = 0;
        this.numberOfArchives = 0;
        this.zero = 0;
        this.numberOfFiles = 0;
        this.zero2 = 0;

        this.toc = new ArchiveTOC();
    };
};

module.exports = Archive;