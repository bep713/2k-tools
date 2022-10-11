class Texture {
    constructor() {
        this.index = 0;                 // the sequence that each texture header exists in the file
        this.dataIndex = 0;      // the sequence that each texture data exists in the file
        this.name = '';
        this._data = null;
        this._header = null;
        this.isChanged = false;

        this.originalData = null;       // reference to the original data buffer in the pristine game files.
        this.preData = null;            // any data that comes between textures, that isn't a texture itself.
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