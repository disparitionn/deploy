const config = require('./config.json');

const defaultConfig = config.config;
const environment = process.env.NODE_ENV || 'config';
const localDir = config.paths.localDir;
const remoteDir = config.paths.remoteDir;

module.exports = {
    defaultConfig,
    remoteDir,
    localDir
};