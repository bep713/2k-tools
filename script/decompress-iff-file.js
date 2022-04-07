const fs = require('fs');
const MultiStream = require('multistream');
const { pipeline, Readable } = require('stream');

const IFFReader = require('../src/parser/IFFReader');
const IFFWriter = require('../src/parser/IFFWriter');

const INPUT_FILE_PATH = 'D:\\Projects\\CHoops2k8\\0000000b.iff.bak';
const OUTPUT_FILE_PATH = 'D:\\Projects\\CHoops2k8\\0000000b_uncompressed.iff';

(async () => {
    const reader = new IFFReader();

    await new Promise((resolve, reject) => {        
        pipeline(
            fs.createReadStream(INPUT_FILE_PATH),
            reader,
            (err) => {
                if (err) reject(err);

                const writer = new IFFWriter(reader.file);
                
                pipeline(
                    writer,
                    fs.createWriteStream(OUTPUT_FILE_PATH),
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                )
            }
        );
    });
})();