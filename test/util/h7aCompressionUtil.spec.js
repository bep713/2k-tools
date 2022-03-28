const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { expect } = require('chai');

const h7aCompressionUtil = require('../../src/util/h7aCompressionUtil');

const PATH_TO_COMPRESSED_DATA_SIMPLE = path.join(__dirname, '../data/compression/1_compressed.dat');
const PATH_TO_EXPECTED_DATA_SIMPLE = path.join(__dirname, '../data/compression/1_uncompressed.dat');
const PATH_TO_TEST_DATA_SIMPLE = path.join(__dirname, '../data/compression/1_test_uncompressed.dat');

const PATH_TO_COMPRESSED_DATA_COMPLEX = path.join(__dirname, '../data/compression/2_compressed.dat');
const PATH_TO_EXPECTED_DATA_COMPLEX = path.join(__dirname, '../data/compression/2_uncompressed.dat');
const PATH_TO_TEST_DATA_COMPLEX = path.join(__dirname, '../data/compression/2_test_uncompressed.dat');

const compressedSimple = fs.readFileSync(PATH_TO_COMPRESSED_DATA_SIMPLE);
const expectedSimple = fs.readFileSync(PATH_TO_EXPECTED_DATA_SIMPLE);

const compressedComplex = fs.readFileSync(PATH_TO_COMPRESSED_DATA_COMPLEX);
const expectedComplex = fs.readFileSync(PATH_TO_EXPECTED_DATA_COMPLEX);

describe('h7a compression util tests', () => {
    it('decompresses expected result', () => {
        const decompressed = h7aCompressionUtil.decompress(compressedSimple, 0x160, 8);
        fs.writeFileSync(PATH_TO_TEST_DATA_SIMPLE, decompressed);
        testBufferHashes(decompressed, expectedSimple);
    });

    it('decompresses a complex example', () => {
        const decompressed = h7aCompressionUtil.decompress(compressedComplex, 0x9000, 13);
        fs.writeFileSync(PATH_TO_TEST_DATA_COMPLEX, decompressed);
        testBufferHashes(decompressed, expectedComplex);
    });
});

function testBufferHashes(bufferToTest, bufferToCompare) {
    let testHash = crypto.createHash('sha1');
    testHash.update(bufferToTest);

    let compareHash = crypto.createHash('sha1');
    compareHash.update(bufferToCompare);

    expect(testHash.digest('hex')).to.eql(compareHash.digest('hex'));
};