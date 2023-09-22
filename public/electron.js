const electron = require("electron");
const {Notification, Menu, Tray } = require("electron");
const path = require("path");
const remote_main = require('@electron/remote/main');
var protobuf = require("protobufjs");
const { clipboard } = require('electron');
remote_main.initialize();
const {WebSocket} = require("ws");
const { existsSync, writeFileSync, readFileSync } = require("fs");
const Crypto = require("./Crypto");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function startWebsocket() {
  //We will need this later
  // const ws = new WebSocket('wss://chrissytopher.com:40441/events/'+auth.email);

  // ws.on('error', console.error);

  // ws.on('open', function open() {
  //   console.log("ws started");
  // });

  // ws.on('message', async function message(data) {
    
  // });
}

//Don't call this rn but we will be using protobufs, don't question me on this one
async function load_protobufs() {
  return new Promise((resolve, reject) => {
    protobuf.load("/home/christopher/AndroidStudioProjects/shared-clipboard/shared-clipboard-electron-react/public/shared_clipboard.proto", function (err, root) {
      if (err) {
        reject(err);
      }
      resolve(root);
    });
  })
}

let tray = null
async function createWindow() {
  //Trays are cool right?
  if (process.platform === "darwin") {
    tray = new Tray(electron.nativeImage.createFromPath(__dirname + "/../build/SharedClipboardIcon.png"));
  } else if (process.platform === "win32") {
    tray = new Tray(__dirname + "/../build/SharedClipboardColor.ico");
  } else {
    tray = new Tray(__dirname + "/../build/SharedClipboardColor.png");
  }
  const contextMenu = Menu.buildFromTemplate([
    { label: 'SharedClipboard', type: 'normal', enabled: false },
    { label: 'Quit', type: 'checkbox', role: "quit"},
  ])
  tray.setContextMenu(contextMenu)

  // protos = await load_protobufs();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
  let webContents = mainWindow.webContents;
  remote_main.enable(webContents)
}

electron.ipcMain.handle('save-auth', async (event, auth) => {
  //we will probably use this later?
  writeFileSync(app.getPath("userData")+"/auth.json", JSON.stringify(auth));
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

module.exports = { app };