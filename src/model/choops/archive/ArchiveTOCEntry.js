class ArchiveTOCEntry {
    constructor() {
        this.id = 0;
        this.nameHash = 0;
        this.name = '';
        this.rawOffset = 0;
        this.offset = 0;
        this.zero = 0;
        this.size = 0;
        this.isSplit = false;
        this.splitSecondFileSize = 0;
    };
};

module.exports = ArchiveTOCEntry;