/**
 * ==============================================================================
 * B HOME - Product Specialist Web Studio Launcher
 * ==============================================================================
 * This script runs the Web Studio frontend and connects directly to the local
 * Express backend running on port 8090.
 *
 * Usage:
 *   node launch.js
 *   node launch.js --port 5173
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port Configuration
const args = process.argv.slice(2);
const portArgIdx = args.indexOf('--port');
const PORT = portArgIdx !== -1 ? parseInt(args[portArgIdx + 1], 10) : (process.env.PORT || 5173);

const DIST_DIR = path.join(__dirname, 'dist');
const BACKEND_URL = 'http://192.168.1.3:8090';

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// 1. Check if production build exists; if not, build it automatically
if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.log('⚡ Production build (dist) not found. Running build now...');
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Build completed successfully.\n');
  } catch (err) {
    console.error('❌ Build failed. Please run "npm run build" manually.', err);
    process.exit(1);
  }
}

// 2. Create HTTP Server to serve Web Studio
const server = http.createServer((req, res) => {
  // Normalize request URL
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check file existence
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: serve index.html for client routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  });
});

// 3. Find Network IP addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// 4. Start Server
server.listen(PORT, '0.0.0.0', () => {
  const networkIps = getNetworkIps();

  console.log('\n===============================================================');
  console.log('🚀 B HOME - PRODUCT SPECIALIST WEB STUDIO IS RUNNING');
  console.log('===============================================================');
  console.log(`📍 Localhost:     http://localhost:${PORT}`);
  if (networkIps.length > 0) {
    networkIps.forEach((ip) => {
      console.log(`🌐 Network URL:    http://${ip}:${PORT}`);
    });
  }
  console.log('---------------------------------------------------------------');
  console.log(`📡 Backend Bridge: ${BACKEND_URL}`);
  console.log(`📁 Local Pictures: C:\\mssql-firebase-bridge\\Pictures`);
  console.log('===============================================================\n');

  // Open Default Browser automatically
  const targetUrl = `http://localhost:${PORT}`;
  const startCmd = process.platform === 'win32' ? `start ${targetUrl}` : `open ${targetUrl}`;
  exec(startCmd, (err) => {
    if (!err) console.log(`✨ Opened ${targetUrl} in your default browser.\n`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try: node launch.js --port ${PORT + 1}`);
  } else {
    console.error('❌ Server error:', err);
  }
});
