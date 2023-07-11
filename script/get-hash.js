const path = require('path');
const fs = require('fs/promises');

const hashUtil = require('../src/util/2kHashUtil');


const STRING_TO_HASH = "title_screen";

(async () => {
    const hash = await hashUtil.hash(STRING_TO_HASH, 0xFFFFFFFF);
    console.log(hash.toString(16).padStart(8, '0'));
})();