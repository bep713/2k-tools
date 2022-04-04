const { expect } = require('chai');
const hashUtil = require('../../src/util/2kHashUtil');

describe('2k hash util unit tests', () => {
    it('expected result', async () => {
        const hash = await hashUtil.hash('opaque', 0xFFFFFFFF);
        expect(hash).to.equal(0xf873b100);
    });

    it('expected result - IFF', async () => {
        const hash = await hashUtil.hash('global.iff', 0xFFFFFFFF);
        expect(hash).to.equal(0xdb5e3e48);
    });
});