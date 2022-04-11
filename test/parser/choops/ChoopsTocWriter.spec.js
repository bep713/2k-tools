const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const{ pipeline } = require('stream');
const Multistream = require('multistream');

const ChoopsController = require('../../../src/controller/ChoopsController');
const ChoopsTocWriter = require('../../../src/parser/choops/ChoopsTocWriter');

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'C:\\Users\\Public\\Public Games\\College Hoops 2K8 [U] [BLUS-30078]\\PS3_GAME\\USRDIR';

describe('Choops TOC Writer tests', () => {
    let outputBuffer, outputBuffers = [];

    before(async function () {
        this.timeout(60000);
        
        const controller = new ChoopsController();
        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read({
            buildCache: false
        });
        
        await new Promise(async (resolve, reject) => {
            const writer = new ChoopsTocWriter(controller.cache.archiveCache);

            writer.on('data', (chunk) => {
                outputBuffers.push(chunk);
            });
    
            writer.on('end', () => {
                outputBuffer = Buffer.concat(outputBuffers);
                resolve();
            });
        });
    });

    it('writes the expected file header', () => {
        expect(outputBuffer.readUInt32BE(0x0)).to.equal(0xAA00B3BF);
        expect(outputBuffer.readUInt32BE(0x4)).to.equal(0x800);
        expect(outputBuffer.readUInt32BE(0x8)).to.equal(0x5);
        expect(outputBuffer.readUInt32BE(0xC)).to.equal(0x0);
        expect(outputBuffer.readUInt32BE(0x10)).to.equal(0xD30);
        expect(outputBuffer.readUInt32BE(0x14)).to.equal(0x0);
    });

    it('writes expected archive data', () => {
        expect(outputBuffer.readUInt32BE(0x18)).to.equal(0x80000);
        expect(outputBuffer.readUInt32BE(0x1C)).to.equal(0x0);
        expect(outputBuffer.readUInt32BE(0x20)).to.equal(0x300041);
        expect(outputBuffer.readUInt32BE(0x24)).to.equal(0x0);

        expect(outputBuffer.readUInt32BE(0x28)).to.equal(0x80000);
        expect(outputBuffer.readUInt32BE(0x2C)).to.equal(0x0);
        expect(outputBuffer.readUInt32BE(0x30)).to.equal(0x300042);
        expect(outputBuffer.readUInt32BE(0x34)).to.equal(0x0);
    });

    it('writes expected TOC', () => {
        expect(outputBuffer.readUInt32BE(0x68)).to.equal(0xF5E6);
        expect(outputBuffer.readUInt32BE(0x6C)).to.equal(0xD378E);
        expect(outputBuffer.readBigUInt64BE(0x70)).to.equal(0x30n);

        expect(outputBuffer.readUInt32BE(0x78)).to.equal(0xF812A);
        expect(outputBuffer.readUInt32BE(0x7C)).to.equal(0x1F79AC);
        expect(outputBuffer.readBigUInt64BE(0x80)).to.equal(0x88994n);

        expect(outputBuffer.readUInt32BE(0x2D38)).to.equal(0x3665957F);
        expect(outputBuffer.readUInt32BE(0x2D3C)).to.equal(0x215B8B);
        expect(outputBuffer.readBigUInt64BE(0x2D40)).to.equal(0x8D986n);

        expect(outputBuffer.readUInt32BE(0xD358)).to.equal(0xFFE888FD);
        expect(outputBuffer.readUInt32BE(0xD35C)).to.equal(0xD377D);
        expect(outputBuffer.readBigUInt64BE(0xD360)).to.equal(0x30n);
    });
});