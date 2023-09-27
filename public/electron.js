const WebSocket = require("ws").WebSocket;
const electron = require("electron");
const { Notification, Menu, Tray } = require("electron");
const path = require("path");
const remote_main = require('@electron/remote/main');
var protobuf = require("protobufjs");
remote_main.initialize();
const { existsSync, writeFileSync, readFileSync } = require("fs");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Crypto = require("./NodeCrypto");
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let auth;
let protos;
let db;

async function load_protobufs() {
	return new Promise((resolve, reject) => {
		protobuf.load(__dirname + "/../build/message.proto", function (err, root) {
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
		{ label: 'Blue Ovals', type: 'normal', enabled: false },
		{ label: 'Show/Hide', type: 'checkbox', click: () => {
			if (mainWindow.isVisible()) {
				mainWindow.hide();
			} else {
				mainWindow.show();
			}
		}},
		{ label: 'Quit', type: 'checkbox', role: "quit" },
	])
	tray.setContextMenu(contextMenu)

	// protos = await load_protobufs();
	console.log(app.getPath("userData"));
	if (existsSync(app.getPath("userData") + "/auth.json")) {
		auth = JSON.parse(readFileSync(app.getPath("userData") + "/auth.json"));
	}
	protos = await load_protobufs();
	db = new sqlite3.Database(app.getPath("userData") + "/messages.db");
	//unsure of what will happen if an older version has different/less fields, if this fails after changes delete the database file
	db.run("CREATE TABLE IF NOT EXISTS messages (uuid TEXT, text TEXT, sender TEXT, sent_timestamp BIGINT)");
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: { nodeIntegration: true, contextIsolation: false, preload: path.join(__dirname, 'preload.js') },
	});
	mainWindow.on('close', function (evt) {
		if (mainWindow.isVisible()) {
			evt.preventDefault();
			mainWindow.hide();
		}
	});
	mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
	let webContents = mainWindow.webContents;
	remote_main.enable(webContents)
}

electron.ipcMain.handle('save-auth', async (event, new_auth) => {
	auth = new_auth;
	writeFileSync(app.getPath("userData") + "/auth.json", JSON.stringify(auth));
});

electron.ipcMain.handle('get-auth', async (event) => {
	return auth;
});

electron.ipcMain.handle('save-message', async (event, message, sender) => {
	return save_message(message, sender);
});

function save_message(message, sender) {
	let sql_command = `INSERT INTO messages VALUES ('${message.uuid}', '${message.text}', '${sender}', ${message.timestamp})`;
	db.run(sql_command);
	return {uuid: message.uuid, text: message.text, sender: sender, sent_timestamp: message.timestamp};
}

electron.ipcMain.handle('get-all-messages', async (event) => {
	let promise = new Promise((resolve, reject) => {
		let messages = [];
		db.each("SELECT * FROM messages", (err, row) => {
			if (err) {
				reject(err);
			}
			messages.push(row);
		}, () => {
			resolve(messages);
		});
	})
	return promise;
});

electron.ipcMain.handle('get-some-messages', async (event, sql) => {
	let promise = new Promise((resolve, reject) => {
		let messages = [];
		db.each(`SELECT ${sql} FROM messages`, (err, row) => {
			if (err) {
				reject(err);
			}
			messages.push(row);
		}, () => {
			resolve(messages);
		});
	})
	return promise;
});

electron.ipcMain.handle('start-websocket', async (event) => {
	const ws = new WebSocket('wss://chrissytopher.com:40441/events/' + auth.uuid);

	ws.on('error', console.error);

	ws.on('open', function open() {
		console.log("ws started");
		ws.send(auth.email);
		ws.send(auth.password);
		//I haven't quite figured out how to get this to work but I'll figure it out soon
		mainWindow.webContents.send('websocket-open');
	});

	ws.on('message', async function message(data) {
		if (data == "😝") return;
		let message_json = JSON.parse(data.toString());
		let Message = protos.lookupType("Message");
		let message = Message.decode(await Crypto.decryptAsArray(auth.private_key, message_json.data));
		save_message(message, message_json.sender);
		//for now there is no way to get a callback on a new message, poll the database on an interval
		mainWindow.webContents.send('websocket-message', message);

		//testing code
		console.log(message);
	});
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

module.exports = { app };