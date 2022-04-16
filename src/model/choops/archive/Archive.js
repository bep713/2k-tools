class Archive {
    constructor() {
        this.sizeRaw = 0;
        this.zero = 0;
        this.name = '';
    };

    get size() {
        return this.sizeRaw << 0xB;
    };

    set size(size) {
        this.sizeRaw = size >> 0xB;
    };
};

module.exports = Archive;