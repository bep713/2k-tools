const path = require('path');
const fs = require('fs/promises');

module.exports.getGameFilePaths = async (directoryPath) => {
    const dir = await fs.readdir(directoryPath);
    
    const filteredDirs = dir.filter((dirname) => {
        return dirname[0] === '0';
    });

    const fullGamePathDirs = filteredDirs.map((dirname) => {
        return path.join(directoryPath, dirname);
    });

    return fullGamePathDirs;
};

module.exports.getGameFilePathByIndex = async (directoryPath, index) => {
    const paths = await this.getGameFilePaths(directoryPath);
    return paths[index];
};