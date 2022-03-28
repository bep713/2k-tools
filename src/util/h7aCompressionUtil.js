module.exports.decompress = (buf, decompressedSize, shiftAmount = 0x8) => {
    let currentCompressedOffset = 0;
    let currentDecompressedOffet = 0;
    let output = Buffer.alloc(decompressedSize);

    do {
        let descriptor = buf[currentCompressedOffset++];

        for (let bitOffset = 0; bitOffset <= 7; bitOffset++) {
            if (currentDecompressedOffet >= decompressedSize) {
                break;
            }

            if ((descriptor & 1) > 0) {
                let lookbackLength = buf[currentCompressedOffset++];
                let sequenceLength = buf[currentCompressedOffset++];

                lookbackLength = (lookbackLength << 8) + sequenceLength;
                
                sequenceLength = (lookbackLength >> shiftAmount & (1 << 15 - shiftAmount + 1) - 1) + 2;
                lookbackLength = lookbackLength >> 0 & (1 << (shiftAmount - 1) + 1) - 1;

                for (let i = 0; i <= sequenceLength; i++) {
                    output[currentDecompressedOffet] = output[currentDecompressedOffet - lookbackLength];
                    currentDecompressedOffet += 1;
                }
            }
            else {
                output[currentDecompressedOffet++] = buf[currentCompressedOffset++];
            }

            descriptor >>= 1;
        }
    } while (currentCompressedOffset < buf.length);

    return output;
};