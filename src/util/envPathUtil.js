const envPaths = require('env-paths');
const mkdir = require('make-dir');

module.exports.getEnvPath = async () => {
    const paths = envPaths('2k-tools');
    await mkdir(paths.config);
    return paths;
};