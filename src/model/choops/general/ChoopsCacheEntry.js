const CacheEntry = require("../general/CacheEntry");

class ChoopsCacheEntry extends CacheEntry {
    constructor() {
        super();
        this.unknown = 0;
        this.rawOffset = 0;
        this.original = {};
    };

    setCurrentDataAsOriginal() {
        this.original.id = this.id;
        this.original.size = this.size;
        this.original.name = this.name;
        this.original.offset = this.offset;
        this.original.unknown = this.unknown;
        this.original.location = this.location;
        this.original.rawOffset = this.rawOffset;
    };
};

module.exports = ChoopsCacheEntry;