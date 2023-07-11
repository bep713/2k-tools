const path = require('path');
const zlib = require('zlib');
const fs = require('fs/promises');
const envPathUtil = require('./envPathUtil');

module.exports.buildAndSaveCache = (cacheName, data) => {
    return new Promise(async (resolve, reject) => {
        const envPaths = await envPathUtil.getEnvPath();

        zlib.gzip(JSON.stringify(data), async (err, compressedData) => {
            if (err) {
                reject(err);
            }

            await fs.writeFile(path.join(envPaths.config, cacheName), compressedData);
            resolve(compressedData);
        });
    });
};

module.exports.getCache = (cacheName, cachePathOverride) => {
    return new Promise(async (resolve, reject) => {
        const envPaths = await envPathUtil.getEnvPath();

        try {
            const cachePath = cachePathOverride ? cachePathOverride : path.join(envPaths.config, cacheName);
            const compressedCache = await fs.readFile(cachePath);

            zlib.gunzip(compressedCache, (err, decompressedData) => {
                if (err) {
                    reject(err);
                }
    
                resolve(JSON.parse(decompressedData));
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

module.exports.getFormattedCacheName = (gameName) => {
    if (!gameName) {
        gameName = 'default';
    }

    return `${gameName.replace(/\s+/g, '')}.cache`;
};

module.exports.CACHES = {
    CHOOPS: {
        cache: 'choops.cache'
    }
};