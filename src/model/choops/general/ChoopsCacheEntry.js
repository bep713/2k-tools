const CacheEntry = require("../../general/CacheEntry");

class ChoopsCacheEntry extends CacheEntry {
    constructor() {
        super();
        this.nameHash = 0;
        this.rawOffset = 0;
        this.original = {};
    };

    setCurrentDataAsOriginal() {
        this.original.id = this.id;
        this.original.size = this.size;
        this.original.name = this.name;
        this.original.offset = this.offset;
        this.original.isSplit = this.isSplit;
        this.original.unknown = this.unknown;
        this.original.location = this.location;
        this.original.rawOffset = this.rawOffset;
        this.original.splitSecondFileSize = this.splitSecondFileSize;
    };

    revert() {
        this.id = this.original.id;
        this.size = this.original.size;
        this.name = this.original.name;
        this.offset = this.original.offset;
        this.isSplit = this.original.isSplit;
        this.unknown = this.original.unknown;
        this.location = this.original.location;
        this.rawOffset = this.original.rawOffset;
        this.splitSecondFileSize = this.original.splitSecondFileSize;
    };
};

module.exports = ChoopsCacheEntry;