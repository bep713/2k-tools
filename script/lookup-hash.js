const fs = require('fs');
const path = require('path');

const HASH_TO_LOOKUP = 0xA25218B2;
const PATH_TO_LOOKUP = path.join(__dirname, '../src/data/hash-lookup.json');

const lookup = JSON.parse(fs.readFileSync(PATH_TO_LOOKUP));
const data = lookup.find(item => {
    return item.hash === HASH_TO_LOOKUP;
});

console.log(data);