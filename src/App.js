import './App.css';
import { useEffect } from 'react';
import Crypto from "./Crypto.js"
const Electron = require("electron");

function App() {
	useEffect(() => {
		(async () => {
			if (await Electron.ipcRenderer.invoke('get-auth') === undefined) {
				let basic_auth_json = {
					email: "christopher@huntwork.net",
					password: "balls",
				};
				//check if req failed later but for now it doesn't matter
				// eslint-disable-next-line no-unused-vars
				let create_res = await (await fetch("https://chrissytopher.com:40441/create-account/", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(basic_auth_json)
				})).json();
				console.log(create_res);
				let keys = await Crypto.generateKeyPair();
				let ids_res = await (await fetch("https://chrissytopher.com:40441/register-ids/", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						...basic_auth_json,
						public_key: keys.publicKey,
					})
				})).json();
				if (ids_res.success) {
					let uuid = ids_res.uuid;
					let full_auth_json = {
						...basic_auth_json,
						uuid: uuid,
						public_key: keys.publicKey,
						private_key: keys.privateKey,
					};
					await Electron.ipcRenderer.invoke('save-auth', full_auth_json);
					send_message(basic_auth_json.email, "Hello World?");
				} else {
					throw ids_res.error;
				}
			}
			let auth = await Electron.ipcRenderer.invoke('get-auth');
			const ws = new WebSocket('wss://chrissytopher.com:40441/events/' + auth.uuid);
			ws.onerror = console.error;

			ws.onopen = () => {
				console.log("ws started");
				ws.send(auth.email);
				ws.send(auth.password);
				send_message(auth.email, "Hello World?");
			};

			ws.ononmessage = async function message(data) {
				if (data == "😝") return;
				console.log(data.toString());
				console.log(await Crypto.decrypt(auth.private_key, data.toString()));
			};
		})();
	}, []);
	return (
		<div className="App">
			<h1>Hi Ben you should do some ui 👍️👍️</h1>
		</div>
	);
}

async function send_message(recipient, message) {
	let auth = await Electron.ipcRenderer.invoke('get-auth');
	let ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + recipient)).json();
	ids.ids.forEach(async device => {
		let encrypted_message = await Crypto.encrypt(device.public_key, message);
		let res = await fetch("https://chrissytopher.com:40441/post-message/", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				account: {
					email: auth.email,
					password: auth.password,
				},
				recipient: device.uuid,
				data: encrypted_message,
			})
		});
		console.log(await res.json());
	});
}

export default App;
