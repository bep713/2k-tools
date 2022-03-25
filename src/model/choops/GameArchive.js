class GameArchive {
    constructor() {
        this.magic = 0;
        this.alignment = 0;
        this.numberOfArchives = 0;
        this.zero = 0;
        this.numberOfFiles = 0;
        this.zero2 = 0;
        
        this.archives = [];
        this.toc = [];
    };
};

module.exports = GameArchive;