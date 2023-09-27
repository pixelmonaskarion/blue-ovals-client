import { useEffect, useState, useRef } from 'react';
import Crypto from "./Crypto.js"
import { TextField, IconButton} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
const Electron = require("electron");
var protobuf = require("protobufjs");
let protos = await load_protobufs();

function MessagesScreen() {
    const [auth, setAuth] = useState(undefined);
    useEffect(() => {
        Electron.ipcRenderer.invoke('start-websocket');
        Electron.ipcRenderer.invoke('get-auth').then(data => {
            console.log(data);
            setAuth(data);
        });
    }, []);

	const [messageList, setMessageList] = useState([]);

	const [fieldValue, setFieldValue] = useState('');

    const messagesEndRef = useRef();

	function handleTextFieldChange(e) {
		setFieldValue(e.target.value);
	}

    Electron.ipcRenderer.invoke('get-all-messages').then(data => {
        setMessageList(afterGetmessages(data));
    });

    useEffect(() => {
        if (messageList.length)
        {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        }

    }, [messageList.length, auth]);

	let message_elements;
    if (auth !== undefined) {
        message_elements = <div className='messagesList'>
            {/* Render chat messages here */}
            {messageList.map((message2, i) => (
                <Message message={message2.text} self={(message2.sender === auth.email)} timestamp={message2.sent_timestamp} messageList={messageList} id={i}/>
            ))}
            {/* Add more message items as needed */}
            <div ref={messagesEndRef} />
        </div>
    }
	return (
		<div>
            {message_elements}
			<div className='inputContainer'>
				<TextField className='messageInput' label="Type message..." variant="standard" onChange={handleTextFieldChange}/>
				<IconButton onClick={() => handleSend(fieldValue)}>
					<SendIcon/>
				</IconButton>
			</div>
		</div>
	);
}

async function handleSend(message) {
	send_message("christopher@huntwork.net", new_message(message));
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
		let Message = protos.lookupType("Message");
		let encrypted_message = await Crypto.encryptBytes(device.public_key, Message.encode(message).finish());
		// eslint-disable-next-line no-unused-vars
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
	});
	if (recipient !== auth.email) {
		let your_ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + auth.email)).json();
		your_ids.ids.forEach(async device => {
			let Message = protos.lookupType("Message");
			let encrypted_message = await Crypto.encryptBytes(device.public_key, Message.encode(message).finish());
			// eslint-disable-next-line no-unused-vars
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
		});
	}
}

function new_message(text, replyuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: text, uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: replyuuid, reply: (replyuuid !== undefined)});
}

function new_reaction(reaction, aboutuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: aboutuuid, reaction: reaction});
}

function new_delivered_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: message_uuid, status: 0});
}

function new_read_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: message_uuid, status: 1});
}

function afterGetmessages(messages)
{
  //console.log(messages);
  return messages;
}

const Message = (props) => {
	const message = props.message ? props.message : "no message";
	const self = props.self;
	const timestamp = new Date(props.timestamp);
	//passing in the message list allows to be able to compare to other messagess
	const messageList = props.messageList;
	//id is the number message it is
	const id = props.id;

	//difference in minutes between messages to show timestamp
	const time_difference_thresh = 10;

	var showTimestamp = false;

	if (id != messageList.length - 1)
	{
		var millisDiff = new Date(messageList[id + 1].sent_timestamp) - timestamp;
		var minutesDiff = Math.floor((millisDiff/1000)/60);
		console.log(minutesDiff);
		if (minutesDiff > time_difference_thresh)
		{
			showTimestamp = true;
		}
	}
	

	return (
		<div className={self ? 'selfMessageWrapper' : 'otherMessageWrapper'}>
			<div className={self ? 'selfInnerMessage' : 'selfInnerMessage'}>
				<p>{message}</p>
			</div>
			
			<p style={{display: (showTimestamp ? 'block' : 'none')}} className='timestamp'>{timestamp.getHours()%12}:{timestamp.getMinutes()}</p>
		</div>
	);
}

export default MessagesScreen;