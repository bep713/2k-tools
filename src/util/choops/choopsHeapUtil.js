const fs = require('fs/promises');
const path = require('path');

const PATH_TO_HEAP = path.join(__dirname, '../../data/choops/choops-heap.dat');
let heapCache;

module.exports.getHeap = async () => {
    if (heapCache) { return heapCache; }
    else {
        heapCache = await fs.readFile(PATH_TO_HEAP);
        return heapCache;
    }
};