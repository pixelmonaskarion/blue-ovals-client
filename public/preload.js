const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onWebsocketMessage: (callback) => ipcRenderer.on('websocket-message', callback),
  onWebsocketOpen: (callback) => ipcRenderer.on('websocket-open', callback)
})