const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  const fs = require('fs');
  const isPackaged = app.isPackaged;
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');

  // Let's set NODE_ENV to production if dist/server.cjs exists, 
  // because running the precompiled production server (which serves pre-built assets)
  // is 100x faster than compilation, bypassing tsx/npx entirely.
  const hasPrecompiledServer = fs.existsSync(serverPath);
  
  if (hasPrecompiledServer) {
    process.env.NODE_ENV = 'production';
    try {
      console.log(`Starting Express server directly in-process: ${serverPath}`);
      require(serverPath);
      return; 
    } catch (e) {
      console.error("Failed to start server in-process, trying backup spawn:", e);
      
      // Fallback: spawn node directly
      serverProcess = spawn('node', [serverPath], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production' },
        shell: true,
        windowsHide: true
      });
    }
  } else {
    // Fallback/Development mode when compiled server does not exist
    const env = { ...process.env, NODE_ENV: 'development' };
    const tsxLocalPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    
    if (fs.existsSync(tsxLocalPath)) {
      console.log("No compiled server found, starting with local tsx cli...");
      serverProcess = spawn('node', [tsxLocalPath, 'server.ts'], {
        cwd: process.cwd(),
        env,
        shell: true,
        windowsHide: true 
      });
    } else {
      console.log("No compiled server or local tsx loader found, fallback to npx...");
      serverProcess = spawn('npx', ['tsx', 'server.ts'], {
        cwd: process.cwd(),
        env,
        shell: true,
        windowsHide: true 
      });
    }
  }

  if (serverProcess) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "QuoteFlow",
    icon: path.join(__dirname, 'public', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Hide default menu for a clean app feel
    autoHideMenuBar: true,
  });

  // Instead of static delay, poll the API server until it's ready.
  // This supports both super fast loads and slow laptop spin-ups with complete robustness!
  const http = require('http');
  let checkCount = 0;
  const checkServer = () => {
    if (!mainWindow) return;
    
    http.get('http://127.0.0.1:3000/api/health', (res) => {
      if (res.statusCode === 200) {
        console.log("Backend server is ready, loading application UI.");
        mainWindow.loadURL('http://localhost:3000');
      } else {
        retryCheck();
      }
    }).on('error', () => {
      retryCheck();
    });
  };

  const retryCheck = () => {
    if (!mainWindow) return;
    checkCount++;
    // If it's taking a while (approx 15s), try loading anyway as fallback
    if (checkCount > 30) { 
      console.log("Server verification timed out, attempting direct load.");
      mainWindow.loadURL('http://localhost:3000');
    } else {
      setTimeout(checkServer, 500);
    }
  };

  checkServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  // On Windows/Linux, quit app and stop server
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
