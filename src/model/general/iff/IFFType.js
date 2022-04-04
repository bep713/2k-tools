module.exports.TYPES = {
    UNKNOWN: 0,
    TXTR: 1,
    SCNE: 2,
    AUDO: 3,
    LAYT: 4,
    MRKS: 5,
    PRIV: 6,
    TXT: 7,
    DRCT: 8,
    CLTH: 9,
    AMBO: 10,
    HILT: 11
};

module.exports.stringToType = (str) => {
    if (str.slice(-1) === '\0') {
        str = str.slice(0, str.length - 1);
    }
    
    switch (str) {
        case 'TXTR':
            return this.TYPES.TXTR;
        case 'SCNE':
            return this.TYPES.SCNE;
        case 'AUDO':
            return this.TYPES.AUDO;
        case 'LAYT':
            return this.TYPES.LAYT;
        case 'MRKS':
            return this.TYPES.MRKS;
        case 'PRIV':
            return this.TYPES.PRIV;
        case 'TXT':
            return this.TYPES.TXT;
        case 'DRCT':
            return this.TYPES.DRCT;
        case 'CLTH':
            return this.TYPES.CLTH;
        case 'AMBO':
            return this.TYPES.AMBO;
        case 'HILT':
            return this.TYPES.HILT;
        default:
            return this.TYPES.UNKNOWN;
    }
};