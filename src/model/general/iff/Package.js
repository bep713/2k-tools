class Package {
    constructor() {
        this.nameOffset = 0;
        this.name = '';
        this.unk1 = 0;
        this.unk2 = 0;
        this.unk3 = 0;
        this.unk4 = 0;
        this.unk5 = 0;
        this.unk6 = 0;
        this.unk7 = 0;
        this.numberOfTextures = 0;
        this.relativeTextureOffset = 0;
        this.textureOffset = 0;
        this.unk8 = 0;
        this.unk9 = 0;
        this.unk10 = 0;
        this.unk11 = 0;
        this.unk12 = 0;
        this.unk13 = 0;
        this.unk14 = 0;
        this.numberOfModelParts = 0;
        this.relativeModelPartsOffset = 0;
        this.modelPartsOffset = 0;
        this.unk15 = 0;
        this.unk16 = 0;

        this.textures = [];
        this.modelParts = [];
    };
};

module.exports = Package;