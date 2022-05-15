const { Readable, pipeline, Writable } = require('stream');

const IFF = require('../model/general/iff/IFF');
const IFFType = require('../model/general/iff/IFFType');
const PackageReader = require('../parser/PackageReader');
const PackageWriter = require('../parser/PackageWriter');

class IFFController {
    constructor(iffFile) {
        if (iffFile) {
            this.file = iffFile;
        }
        else {
            this.file = new IFF();
        }

        this.fileControllerMap = {};
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
        // returns either a SCNE controller (for SCNE files only) or raw buffer data
        let file = await this.getFileRawData(name, type);

        switch(file.type) {
            case IFFType.TYPES.SCNE:
                const fileDataBlocks = Buffer.concat(file.dataBlocks.map((block) => {
                    return block.data;
                }));

                const resourceDataStream = Readable.from(fileDataBlocks);
        
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

                this.fileControllerMap[`${name}_2`] = file;
        }

        return file;
    };

    async getAllFilesByIFFType(type) {
        return this.file.files.filter((file) => {
            return file.type === type;
        });
    };

    async repack() {
        await Promise.all(Object.keys(this.fileControllerMap).map(async (key) => {
            return new Promise(async (resolve, reject) => {
                const controller = this.fileControllerMap[key];
    
                const iffNameData = key.split('_');    // [0] = name, [1] = type
                const iffSubFile = await this.getFileRawData(iffNameData[0], parseInt(iffNameData[1]));
                
                if (iffSubFile) {
                    if (iffSubFile.type === IFFType.TYPES.SCNE) {
                        if (iffSubFile.dataBlocks.length !== 2) {
                            throw new Error(`Error: Subfiles with more or less than 2 data blocks are not currently supported.`);
                        }
    
                        const writer = new PackageWriter(controller.file);
                        let outputBuffers = [], newScneBuffer = null;
    
                        await new Promise((resolve, reject) => {
                            pipeline(
                                writer.createStream(),
                                new Writable({
                                    write(chunk, enc, cb) {
                                        outputBuffers.push(chunk);
                                        cb();
                                    }
                                }),
                                (err) => {
                                    if (err) {
                                        reject(err);
                                    }
    
                                    newScneBuffer = Buffer.concat(outputBuffers);
                                    resolve(newScneBuffer);
                                }
                            )
                        });
    
                        const firstBlock = newScneBuffer.slice(0, controller.file.offsets.headerBlockSize);
                        iffSubFile.dataBlocks[0].length = firstBlock.length;
                        iffSubFile.dataBlocks[0].data = firstBlock;
    
                        const secondBlock = newScneBuffer.slice(controller.file.offsets.headerBlockSize);
                        iffSubFile.dataBlocks[1].length = secondBlock.length;
                        iffSubFile.dataBlocks[1].data = secondBlock;
                    }
                }

                resolve();
            });
        }));
    };
};

module.exports = IFFController;