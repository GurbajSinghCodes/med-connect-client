// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Limit file watching to only the project directory
config.watchFolders = [path.resolve(__dirname)];

// 2. Use a more efficient file map store (available in newer Metro versions)
// This helps reduce cache corruption issues.
config.cacheStores = [
    new (require('metro-cache').FileStore)({
        root: path.join(__dirname, 'node_modules', '.cache', 'metro-cache'),
    }),
];

// 3. Use worker threads to process file changes on startup (faster on Windows)
config.maxWorkers = 4; // Adjust based on your CPU cores, e.g., half your cores.

module.exports = config;