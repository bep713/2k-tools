const fs = require('fs');
const MultiStream = require('multistream');
const { pipeline, Readable } = require('stream');

const IFFReader = require('../src/parser/IFFReader');
const IFFWriter = require('../src/parser/IFFWriter');

const INPUT_FILE_PATH = 'D:\\GameRips\\CHoops2k8\\full-rip\\ua256.iff';
const OUTPUT_FILE_PATH = 'D:\\GameRips\\CHoops2k8\\full-rip\\ua256\\ua256.iff';

(async () => {
    const reader = new IFFReader();

    try {
        await new Promise((resolve, reject) => {        
            pipeline(
                fs.createReadStream(INPUT_FILE_PATH),
                reader,
                (err) => {
                    if (err) reject(err);
    
                    const writer = new IFFWriter(reader.file);
                    
                    pipeline(
                        writer.createStream(),
                        fs.createWriteStream(OUTPUT_FILE_PATH),
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    )
                }
            );
        });
    } catch (err) {
        console.log(err);
    }
})();