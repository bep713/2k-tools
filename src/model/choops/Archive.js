class Archive {
    constructor() {
        this.sizeRaw = 0;
        this.zero = 0;
        this.name = '';
    };

    get size() {
        return this.sizeRaw << 0xB;
    };
};

module.exports = Archive;