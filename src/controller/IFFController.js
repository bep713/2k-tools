const { Readable, pipeline } = require('stream');

const IFF = require('../model/general/iff/IFF');
const IFFType = require('../model/general/iff/IFFType');
const PackageReader = require('../parser/PackageReader');

class IFFController {
    constructor(iffFile) {
        if (iffFile) {
            this.file = iffFile;
        }
        else {
            this.file = new IFF();
        }
    };

    async getFileRawData(name) {
        if (!name) { throw new Error('getResourceRawData() takes in a mandatory `name` parameter.'); }
        if (this.file.files.length === 0) { throw new Error('The IFF file does not contain any subfiles to read.'); }

        const file = this.file.files.find((file) => {
            return file.name.toLowerCase() === name.toLowerCase()
                || file.name.toLowerCase() === name + '\0'.toLowerCase();
        });

        return file;
    };

    async getFileController(name) {
        let file = await this.getFileRawData(name);

        switch(file.type) {
            case IFFType.TYPES.SCNE:
                const resourceDataStream = Readable.from(Buffer.concat(file.dataBlocks.map((block) => {
                    return block.data;
                })));
    
                // this.progressTracker.totalSteps += 1;
                // this._emitProgress(this.progressTracker.format('Parsing SCNE...'));
        
                file = await new Promise((resolve, reject) => {
                    const parser = new PackageReader();
        
                    pipeline(
                        resourceDataStream,
                        parser,
                        (err) => {
                            if (err) reject(err);
                            else resolve(parser.controller);
                        }
                    )
                });
                
                // this.progressTracker.step();
                // this._emitProgress(this.progressTracker.format('Done parsing SCNE.'));
                // return controller;
        }

        return file;
    };

    async getAllFilesByIFFType(type) {
        return this.file.files.filter((file) => {
            return file.type === type;
        });
    };
};

module.exports = IFFController;