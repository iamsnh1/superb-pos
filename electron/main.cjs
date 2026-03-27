const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { pathToFileURL } = require('url');

// Single instance lock - prevent multiple app windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

let autoUpdater;
if (app.isPackaged) {
    try {
        autoUpdater = require('electron-updater').autoUpdater;
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = false;
    } catch (e) {
        console.warn('electron-updater not available:', e.message);
    }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
    if (require('electron-squirrel-startup')) app.quit();
} catch (e) { /* optional dep, skip if not installed */ }

let mainWindow;
let httpServer; // Express server when run in-process (production)

// Configure database path for persistence
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'tailorflow.db');
process.env.DB_PATH = dbPath;

// ── Version-based data reset ──────────────────────────────────────────────────
// When a new version is installed, wipe old DB so the app starts completely fresh.
const currentVersion = app.getVersion();
const versionFilePath = path.join(userDataPath, 'app_version.txt');

// ⛔ DATA PROTECTION: checkAndResetOnNewVersion() has been DISABLED.
// Customer database (tailorflow.db) is now PRESERVED across all app updates.
// Version tracking is still written for diagnostics but nothing is ever deleted.
function checkAndResetOnNewVersion() {
    try {
        let storedVersion = null;
        if (fs.existsSync(versionFilePath)) {
            storedVersion = fs.readFileSync(versionFilePath, 'utf-8').trim();
        }
        // Always write the current version marker for diagnostics, but NEVER delete the DB.
        fs.writeFileSync(versionFilePath, currentVersion, 'utf-8');
        writeLog(`App version: ${storedVersion || 'first-run'} → ${currentVersion}. Customer data preserved.`);
    } catch (e) {
        writeLog('Version check error: ' + (e.message || e));
    }
}

// Run version check before DB is loaded (will be called in app.whenReady)


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        show: false,
        backgroundColor: '#f8fafc',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());

    // In production, load the built index.html
    // In dev, load localhost
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    // Open external URLs (e.g. wa.me for WhatsApp) in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    if (process.env.ELECTRON_START_URL) {
        mainWindow.loadURL(startUrl);
        mainWindow.webContents.openDevTools();
    } else {
        // In production, wait for server then load
        const logPath = path.join(userDataPath, 'superb-pos.log');
        const errHtml = '<body style="font-family:sans-serif;padding:2em;max-width:500px;margin:0 auto"><h1>Server failed to start</h1><p>Please restart Superb Pos. If it persists, check the log:</p><p style="word-break:break-all;font-size:12px;color:#666">' + logPath + '</p><p style="font-size:12px;color:#666">Tip: Add Superb Pos to Windows Defender exclusions if antivirus might be blocking it.</p></body>';
        const tryLoad = (attempt = 0) => {
            const maxAttempts = 50;
            const req = http.get({ host: '127.0.0.1', port: 3001, path: '/api/health', timeout: 3000 }, (res) => {
                res.resume();
                mainWindow.loadURL('http://127.0.0.1:3001');
            });
            req.on('error', () => {
                if (attempt < maxAttempts) setTimeout(() => tryLoad(attempt + 1), 500);
                else mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errHtml));
            });
            req.on('timeout', () => { req.destroy(); req.emit('error', new Error('timeout')); });
        };
        setTimeout(() => tryLoad(), 1500);
    }

}

function writeLog(msg) {
    try {
        const logPath = path.join(userDataPath, 'superb-pos.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

async function startBackend() {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        console.log('Running in dev mode, assuming server is already running or managed separately.');
        return;
    }

    const serverPath = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
    const frontendPath = path.join(process.resourcesPath, 'dist');

    if (!fs.existsSync(serverPath)) {
        writeLog('Server not found: ' + serverPath);
        return;
    }
    if (!fs.existsSync(frontendPath)) {
        writeLog('Frontend not found: ' + frontendPath);
        return;
    }

    process.env.FRONTEND_PATH = frontendPath;
    process.env.SCHEMA_PATH = path.join(process.resourcesPath, 'server', 'dist', 'db', 'schema.sql');

    try {
        const mod = await import(pathToFileURL(serverPath).href);
        httpServer = await mod.startServer(3001);
    } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        writeLog('Server error: ' + msg);
        if (err && err.stack) writeLog(err.stack);
    }
}

function setupAutoUpdaterEvents() {
    if (!autoUpdater || !mainWindow) return;
    const send = (channel, data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(channel, data);
        }
    };
    autoUpdater.on('checking-for-update', () => send('update:checking'));
    autoUpdater.on('update-available', (info) => send('update:available', info));
    autoUpdater.on('update-not-available', () => send('update:not-available'));
    autoUpdater.on('download-progress', (p) => send('update:progress', p));
    autoUpdater.on('update-downloaded', () => send('update:downloaded'));
    autoUpdater.on('error', (err) => send('update:error', { message: err.message }));
}

ipcMain.handle('check-for-updates', async (event, feedUrl) => {
    if (!autoUpdater || process.env.NODE_ENV === 'development') {
        return { ok: false, error: 'Updates not available in development' };
    }
    try {
        if (feedUrl && typeof feedUrl === 'string' && feedUrl.startsWith('http')) {
            const base = feedUrl.replace(/\/$/, '');
            autoUpdater.setFeedURL({ provider: 'generic', url: base });
        }
        await autoUpdater.checkForUpdates();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('download-update', async () => {
    if (!autoUpdater) return { ok: false };
    try {
        await autoUpdater.downloadUpdate();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('install-update', () => {
    if (!autoUpdater) return { ok: false };
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
});

// Save current window as PDF (for bill/receipt)
ipcMain.handle('save-as-pdf', async (event, defaultFilename) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { ok: false, path: null };
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
        title: 'Save Bill as PDF',
        defaultPath: defaultFilename || 'bill.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false, path: null };
    try {
        const data = await win.webContents.printToPDF({
            printBackground: true,
            margins: { marginType: 'minimum' },
            pageSize: 'A4',
        });
        fs.writeFileSync(filePath, data);
        return { ok: true, path: filePath };
    } catch (err) {
        console.error('printToPDF error:', err);
        return { ok: false, path: null, error: err.message };
    }
});

// Save PDF to Downloads and reveal in folder (for Send via WhatsApp)
ipcMain.handle('save-pdf-for-whatsapp', async (event, filename) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { ok: false, path: null };
    const downloadsPath = app.getPath('downloads');
    const safeName = (filename || 'bill').replace(/[^a-zA-Z0-9-_\.]/g, '-') + '.pdf';
    const filePath = path.join(downloadsPath, safeName);
    try {
        const data = await win.webContents.printToPDF({
            printBackground: true,
            margins: { marginType: 'minimum' },
            pageSize: 'A4',
        });
        fs.writeFileSync(filePath, data);
        shell.showItemInFolder(filePath);
        return { ok: true, path: filePath };
    } catch (err) {
        console.error('printToPDF error:', err);
        return { ok: false, path: null, error: err.message };
    }
});

app.whenReady().then(async () => {
    checkAndResetOnNewVersion(); // Logs version change, but NEVER deletes data (safe for production)
    await startBackend();
    createWindow();
    if (autoUpdater) {
        setupAutoUpdaterEvents();
        setTimeout(() => autoUpdater.checkForUpdates(), 5000);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (httpServer) httpServer.close();
});

app.on('before-quit', () => {
    if (httpServer) {
        httpServer.close();
        httpServer = null;
    }
});
