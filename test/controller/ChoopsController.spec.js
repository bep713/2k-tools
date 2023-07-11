const { expect } = require('chai');

const cacheUtil = require('../../src/util/cacheUtil');
const IFFType = require('../../src/model/general/iff/IFFType');
const ChoopsController = require('../../src/controller/ChoopsController');

const PATH_TO_CHOOPS_ARCHIVE_FOLDER = 'D:\\Media\\Games\\College Hoops 2K8 [U] [BLUS-30078] - Copy\\PS3_GAME\\USRDIR';
const PATH_TO_NBA_2k9_ARCHIVE_FOLDER = 'D:\\Media\\Games\\NBA 2K9 - Copy\\PS3_GAME\\USRDIR';

describe('Choops controller tests', () => {
    describe('CH2k8', () => {
        const TOTAL_NUM_RESOURCES = 3376;

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
            expect(cache.tocCache.length).to.equal(TOTAL_NUM_RESOURCES);
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
            const namedCaches = cache.tocCache.filter((cacheEntry) => {
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
    
            const firstResource = await controller.getFileRawData('0');
            expect(firstResource.length).to.equal(0x30);
        });
    
        it('can retrieve resource data by decoded hash name', async function () {
            this.timeout(30000);
    
            let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read();
    
            const firstResource = await controller.getFileRawData('global.iff');
            expect(firstResource.length).to.equal(0x1EED911);
        });
    
        it('can retrieve a parsed resource', async function () {
            this.timeout(30000);
    
            let controller = new ChoopsController(PATH_TO_CHOOPS_ARCHIVE_FOLDER);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read();
    
            const global = await controller.getFileController('global.iff');
            expect(global.file.files.length).to.equal(0x25B);
            expect(global.file.files[0].name).to.equal('controller_small');
        });
    });

    describe('NBA 2k9', () => {
        const TOTAL_NUM_RESOURCES = 5624;
        const GAME_NAME = 'nba2k9';

        it('reads game data and builds cache', async function () {
            this.timeout(100000);
            
            let controller = new ChoopsController(PATH_TO_NBA_2k9_ARCHIVE_FOLDER, GAME_NAME);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read({
                buildCache: true
            });
    
            const cache = await cacheUtil.getCache(cacheUtil.getFormattedCacheName(GAME_NAME));
            expect(cache.tocCache.length).to.equal(TOTAL_NUM_RESOURCES);
        });
    
        it('can read the game data from cache', async function () {
            this.timeout(100000);
            
            let controller = new ChoopsController(PATH_TO_NBA_2k9_ARCHIVE_FOLDER, GAME_NAME);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read();
    
            expect(controller.data.length).to.equal(TOTAL_NUM_RESOURCES);
    
            const cache = await cacheUtil.getCache(cacheUtil.getFormattedCacheName(GAME_NAME));
            const namedCaches = cache.tocCache.filter((cacheEntry) => {
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

        it('can retrieve resource data by decoded hash name', async function () {
            this.timeout(30000);
    
            let controller = new ChoopsController(PATH_TO_NBA_2k9_ARCHIVE_FOLDER, GAME_NAME);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read();
    
            const firstResource = await controller.getFileRawData('global.iff');
            expect(firstResource.length).to.equal(14755795);
        });

        it('can retrieve a parsed resource', async function () {
            this.timeout(30000);
    
            let controller = new ChoopsController(PATH_TO_NBA_2k9_ARCHIVE_FOLDER, GAME_NAME);
    
            controller.on('progress', (message) => {
                console.log(message.message);
            });
    
            await controller.read();
    
            const global = await controller.getFileController('global.iff');
            expect(global.file.files.length).to.equal(511);
            expect(global.file.files[0].name).to.equal(0);
            expect(global.file.files[0].type).to.equal(IFFType.TYPES.TXTR);
        });
    });
});