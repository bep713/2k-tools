const path = require('path');
const Long = require('long');
const fs = require('fs/promises');

const heapUtil = require('./choops/choopsHeapUtil.js');

let heapData, hashLookup;

let heapPromise = new Promise(async (resolve, reject) => {
    heapData = await heapUtil.getHeap()
    resolve();
});

const PATH_TO_HASHLOOKUP = path.join(__dirname, '../data/hash-lookup.json');

let hashLookupPromise = new Promise(async (resolve, reject) => {
    hashLookup = await fs.readFile(PATH_TO_HASHLOOKUP);
    hashLookup = JSON.parse(hashLookup);
    resolve();
});

module.exports.hash = async (stringToHash, initialHash) => {
    await heapPromise;
    let upperString = stringToHash.toUpperCase();

    let tempData;
    let tempOffset;
    let workingHash = Long.fromInt(initialHash);

    for (let i = 0; i < stringToHash.length; i++) {
        let currentCharacter = upperString.charCodeAt(i);

        do {
            tempOffset = workingHash.xor(currentCharacter);
            currentCharacter >>= 8;
            tempOffset = rldic(tempOffset, 2, 54);
            tempData = heapData.readUInt32BE(tempOffset.getLowBitsUnsigned());
            workingHash = workingHash.and(0xFFFFFF00).shiftRightUnsigned(8).xor(tempData);
        } while (currentCharacter !== 0);
    }

    workingHash = workingHash.not();
    return workingHash.getLowBitsUnsigned();
};

function rldic(theLong, shift, maskBit) {
    return theLong.rotateLeft(shift).and(new Long(0xFFFFFFFF, 0xFFFFFFFF, true).shiftRightUnsigned(maskBit + shift).shiftLeft(shift));
};

module.exports.hashLookup = async (hash) => {
    await hashLookupPromise;
    return hashLookup.find(item => {
        return item.hash === hash;
    });
};