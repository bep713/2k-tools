const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const { expect } = require('chai');
const rewiremock = require('rewiremock/node');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

let fsStub = {
    fds: [],
    open: sinon.spy((_, _2, cb) => {
        const fd = Math.floor(Math.random() * 50000);
        fsStub.fds.push(fd);
        cb(null, fd);
    }),
    write: sinon.spy((_, _2, cb) => { cb(); })
};

const SplitWriter = rewiremock.proxy(() => require('../../src/parser/SplitWriter'), {
    'graceful-fs': fsStub
});

describe('SplitWriter tests', () => {
    beforeEach(() => {
        fsStub.open.resetHistory();
        fsStub.write.resetHistory();
        fsStub.fds = [];
    });

    it('can write a file without splitting', async () => {
        await pipeline(
            Readable.from(Buffer.alloc(1)),
            new SplitWriter({
                cwd: path.join(__dirname, '../data/'),
                firstFileName: '1',
                fileNameFn: (prev) => { return prev + 1; },
                chunkSize: 1
            })
        );

        expect(fsStub.open.callCount).to.equal(1);
        expect(fsStub.write.callCount).to.equal(1);

        expect(fsStub.open.firstCall.args[0]).to.contain('1');
        expect(fsStub.write.firstCall.args[0]).to.equal(fsStub.fds[0]);
    });

    it('can write 2 files', async () => {
        await pipeline(
            Readable.from(Buffer.alloc(2)),
            new SplitWriter({
                cwd: path.join(__dirname, '../data/'),
                firstFileName: '1',
                fileNameFn: (prev) => { return prev + 1; },
                chunkSize: 1
            })
        );

        expect(fsStub.open.callCount).to.equal(2);
        expect(fsStub.write.callCount).to.equal(2);

        expect(fsStub.open.firstCall.args[0]).to.contain('1');
        expect(fsStub.write.firstCall.args[0]).to.equal(fsStub.fds[0]);

        expect(fsStub.open.secondCall.args[0]).to.contain('2');
        expect(fsStub.write.secondCall.args[0]).to.equal(fsStub.fds[1]);
    });

    it('can write correctly if data comes in chunks', async () => {
        await pipeline(
            fs.createReadStream(path.join(__dirname, '../data/iff/s000.iff')),    // 6,168,588 bytes
            new SplitWriter({
                cwd: path.join(__dirname, '../data/'),
                firstFileName: '1',
                fileNameFn: (prev) => { return prev + 1; },
                chunkSize: 1000000
            })
        );

        expect(fsStub.open.callCount).to.equal(7);
    });
});