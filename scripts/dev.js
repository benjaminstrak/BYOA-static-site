const liveServer = require('live-server');
const chokidar = require('chokidar');
const { build } = require('./build');

let isBuilding = false;

// First run the build
build().then(() => {
    // Configure live-server
    const serverConfig = {
        port: 8080,
        root: "dist", // Make sure this points to the dist directory
        open: true,
        file: "index.html",
        wait: 1000, // Wait for all changes
        logLevel: 2 // More verbose logging
    };

    // Watch for file changes
    chokidar.watch('src/**/*', {
        ignored: /(^|[\/\\])\../,
        persistent: true
    }).on('all', async (event, path) => {
        if (isBuilding) return; // Skip if already building
        
        try {
            isBuilding = true;
            console.log(`File ${path} has been ${event}`);
            await build();
        } catch (error) {
            console.error('Build error:', error);
        } finally {
            isBuilding = false;
        }
    });

    // Start the server
    console.log('Starting server...');
    liveServer.start(serverConfig);
}).catch(console.error); 