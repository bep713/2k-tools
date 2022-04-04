class CacheEntry {
    constructor() {
        this.id = 0;
        this.name = '';
        this.size = 0;
        this.offset = 0;
        this.location = null;
        this.isSplit = false;
        this.splitSecondFileSize = 0;
    };
};

module.exports = CacheEntry