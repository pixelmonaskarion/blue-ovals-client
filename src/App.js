import './App.css';
import { useEffect, useState } from 'react';
import Crypto from "./Crypto.js"
import { TextField, IconButton, Send, Icon } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
const Electron = require("electron");
var protobuf = require("protobufjs");




function App() {
	useEffect(() => {
		(async () => {
			let protos = await load_protobufs();
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
					let Message = protos.lookupType("Message");
					send_message(basic_auth_json.email, Message.create({text: "Hello Proto!", uuid: window.crypto.randomUUID()}));
				} else {
					throw ids_res.error;
				}
			}
			let auth = await Electron.ipcRenderer.invoke('get-auth');
			const ws = new WebSocket('wss://chrissytopher.com:40441/events/' + auth.uuid);
			ws.onerror = console.error;

			ws.onopen = async () => {
				console.log("ws started");
				ws.send(auth.email);
				ws.send(auth.password);
				let protos = await load_protobufs();
				let Message = protos.lookupType("Message");
				send_message(auth.email, Message.create({text: "Hello Proto!", uuid: window.crypto.randomUUID()}));
			};

			ws.onmessage = async function message(event) {
				let data = event.data;
				if (data == "😝") return;
				let protos = await load_protobufs();
				let Message = protos.lookupType("Message");
				let message = Message.decode(await Crypto.decryptBytes(auth.private_key, data.toString()));
				await Electron.ipcRenderer.invoke('save-message', message);
				console.log(await get_messages());
			};
		})();
	}, []);

	const messages = [
		{
			self: false,
			text: "Hello World!"
		},
		{
			self: true,
			text: "Hello World!"
		},
		{
			self: true,
			text: "This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
		{
			self: true,
			text: "This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
		{
			self: true,
			text: "This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
		{
			self: true,
			text: "This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
		{
			self: true,
			text: "This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
		{
			self: true,
			text: "This is a mesaging app This is a mesaging app This is a mesaging app This is a mesaging app This is a mesaging app This is a mesaging app This is a mesaging app This is a mesaging app"
		},
		{
			self: false,
			text: "Yes it is"
		},
	];

	const [fieldValue, setFieldValue] = useState('');

	function handleTextFieldChange(e) {
		setFieldValue(e.target.value);
	}

	

	return (
		<div className='App'>
			<div className='messagesList'>
				{/* Render chat messages here */}
				{messages.map((message2, i) => (
					<Message message={message2.text} self={message2.self}/>
				))}
				{/* Add more message items as needed */}
			</div>
			<div className='inputContainer'>
				<TextField className='messageInput' label="Type message..." variant="standard" onChange={handleTextFieldChange}/>
				<IconButton onClick={() => handleSend(fieldValue)}>
					<SendIcon/>
				</IconButton>
			</div>
		</div>
	);
}

async function handleSend(message)
{
	let protos = await load_protobufs();
	let Message = protos.lookupType("Message");
	send_message("christopher@huntwork.net", Message.create({text: message, uuid: window.crypto.randomUUID()}));
}


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

async function send_message(recipient, message) {
	let auth = await Electron.ipcRenderer.invoke('get-auth');
	let ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + recipient)).json();
	ids.ids.forEach(async device => {
		let protos = await load_protobufs();
		let Message = protos.lookupType("Message");
		let encrypted_message = await Crypto.encryptBytes(device.public_key, Message.encode(message).finish());
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

//to save a message
// await Electron.ipcRenderer.invoke('save-message', <PROTO MESSAGE>);
async function get_messages() {
	let protos = await load_protobufs();
	let messages_raw = await Electron.ipcRenderer.invoke('get-all-messages');
	let messages_proto = [];
	messages_raw.forEach((message) => {
		let Message = protos.lookupType("Message");
		messages_proto.push(Message.create(message));
	});
	return messages_proto;
}

const Message = (props) => {
	const message = props.message ? props.message : "no message";
	const self = props.self;

	return (
		<div className={self ? 'selfMessage' : 'otherMessage'}>
			<p>{message}</p>
		</div>
	);
}

export default App;
