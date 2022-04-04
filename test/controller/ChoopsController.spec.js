const { expect } = require('chai');

const cacheUtil = require('../../src/util/cacheUtil');
const ChoopsController = require('../../src/controller/ChoopsController');

const TOTAL_NUM_RESOURCES = 3376;
const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';

describe('Choops2k8 controller tests', () => {
    it('reads game data and builds cache', async function () {
        this.timeout(30000);
        
        let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read({
            buildCache: true
        });

        const cache = await cacheUtil.getCache(cacheUtil.CACHES.CHOOPS.cache);
        expect(cache.length).to.equal(TOTAL_NUM_RESOURCES);
    });

    it('can read the game data from cache', async function () {
        this.timeout(30000);
        
        let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read();

        expect(controller.data.length).to.equal(TOTAL_NUM_RESOURCES);

        const cache = await cacheUtil.getCache(cacheUtil.CACHES.CHOOPS.cache);
        const namedCaches = cache.filter((cacheEntry) => {
            return cacheEntry.name.length > 5;
        }).map((cacheEntry) => {
            return {
                index: cacheEntry.id,
                nameHash: cacheEntry.nameHash,
                name: cacheEntry.name
            }
        }).sort((a, b) => {
            return a.index - b.index;
        });

        console.log(namedCaches);
    });

    it('can retrieve resource data', async function () {
        this.timeout(30000);

        let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read();

        const firstResource = await controller.getResourceRawData('0');
        expect(firstResource.length).to.equal(0x30);
    });

    it('can retrieve resource data by decoded hash name', async function () {
        this.timeout(30000);

        let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read();

        const firstResource = await controller.getResourceRawData('global.iff');
        expect(firstResource.length).to.equal(0x1EED911);
    });

    it('can retrieve a parsed resource', async function () {
        this.timeout(30000);

        let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);

        controller.on('progress', (message) => {
            console.log(message.message);
        });

        await controller.read();

        const global = await controller.getResource('global.iff');
        expect(global.files.length).to.equal(0x25B);
        expect(global.files[0].name).to.equal('controller_small\0');
    });
});