class IFFDataFileBlock {
    constructor() {
        this.index = 0;
        this.offset = 0;
        this.length = 0;
        this._data = null;
        this.isChanged = false;
    };

    set data(data) {
        this._data = data;
        this.isChanged = true;
    };

    get data() {
        return this._data;
    };
};

module.exports = IFFDataFileBlock;