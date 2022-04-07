const path = require('path');
const fs = require('fs/promises');

const hashUtil = require('../src/util/2kHashUtil');

const PATH_TO_STRINGS = path.join('./src/data/choops/choops-strings.csv');
const OUTPUT_PATH = path.join('./src/data/hash-lookup.json');

(async () => {
    let mapping = [];

    let stringData = await fs.readFile(PATH_TO_STRINGS, 'utf-8');

    for (let i = 0; i < 1000; i++) {
        stringData += `${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `s${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `f${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `m${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `uh${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `ua${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `ux${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `uhx${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `uax${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `uay${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `png${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `png${i.toString().padStart(4, '0')}.iff\r\n`;
        stringData += `team_${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `logo_${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `logo_${i.toString().padStart(3, '0')}_wm.iff\r\n`;
        stringData += `dorna${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `selua${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `seluh${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `selux${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `seluhx${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `seluax${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `seluay${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `jumbotron_team_${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `jumbotron_generic_${i.toString().padStart(3, '0')}.iff\r\n`;
    }

    for (let i = 0; i < 100; i++) {
        stringData += `coach${i.toString().padStart(3, '0')}.iff\r\n`;
        stringData += `h${i.toString().padStart(4, '0')}.iff\r\n`;
    }

    await Promise.all(stringData.split(/\r?\n/).slice(1).map(async line => {
        const hash = await hashUtil.hash(line, 0xFFFFFFFF);
        mapping.push({
            hash: hash,
            str: line
        });
    }));

    fs.writeFile(OUTPUT_PATH, JSON.stringify(mapping));
})();