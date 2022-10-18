class Archive {
    constructor() {
        this.sizeRaw = 0n;
        this.zero = 0;
        this.name = '';
    };

    get size() {
        return this.sizeRaw << BigInt(0xB);
    };

    set size(size) {
        this.sizeRaw = size >> BigInt(0xB);
    };
};

module.exports = Archive;