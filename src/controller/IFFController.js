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

    async getFileRawData(name, type) {
        if (!name) { throw new Error('getResourceRawData() takes in a mandatory `name` parameter.'); }
        if (this.file.files.length === 0) { throw new Error('The IFF file does not contain any subfiles to read.'); }

        const files = this.file.files.filter((file) => {
            return file.name.toLowerCase() === name.toLowerCase()
                || file.name.toLowerCase() === name + '\0'.toLowerCase();
        });

        let file;

        if (type) {
            file = files.find((file) => {
                return file.type === type;
            });
        }
        else {
            file = files[0];
        }

        return file;
    };

    async getFileController(name, type) {
        let file = await this.getFileRawData(name, type);

        switch(file.type) {
            case IFFType.TYPES.SCNE:
                const fileDataBlocks = Buffer.concat(file.dataBlocks.map((block) => {
                    return block.data;
                }));

                const resourceDataStream = Readable.from(fileDataBlocks);
    
                // this.progressTracker.totalSteps += 1;
                // this._emitProgress(this.progressTracker.format('Parsing SCNE...'));
        
                file = await new Promise((resolve, reject) => {
                    const parser = new PackageReader({
                        headerBlockSize: file.dataBlocks[0].data.length,
                        dataSize: fileDataBlocks.length
                    });
        
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