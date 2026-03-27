const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    saveAsPdf: (defaultFilename) => ipcRenderer.invoke('save-as-pdf', defaultFilename),
    savePdfForWhatsApp: (filename) => ipcRenderer.invoke('save-pdf-for-whatsapp', filename),
    // Auto-update (only in packaged app)
    checkForUpdates: (feedUrl) => ipcRenderer.invoke('check-for-updates', feedUrl),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateEvent: (callback) => {
        const channels = ['update:checking', 'update:available', 'update:not-available', 'update:progress', 'update:downloaded', 'update:error'];
        const handlers = {};
        channels.forEach(ch => {
            handlers[ch] = (ev, data) => callback({ type: ch, data });
            ipcRenderer.on(ch, handlers[ch]);
        });
        return () => channels.forEach(ch => ipcRenderer.removeListener(ch, handlers[ch]));
    },
});
