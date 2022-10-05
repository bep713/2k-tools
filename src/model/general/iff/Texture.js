class Texture {
    constructor() {
        this.index = 0;
        this.name = '';
        this._data = null;
        this._header = null;
        this.isChanged = false;

        this.originalData = null;       // reference to the original data buffer in the pristine game files.
    };

    get data() {
        return this._data;
    };

    set data(data) {
        this._data = data;
        this.isChanged = true;
    };

    get header() {
        return this._header;
    };

    set header(header) {
        this._header = header;
        this.isChanged = true;
    };
};

module.exports = Texture;