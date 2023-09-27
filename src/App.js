import './App.css';
import { useState } from 'react';
import MessagesScreen from "./MessagesScreen"
import SignInScreen from "./SignInScreen"
const Electron = require("electron");

function App() {
	const [authed, setAuthed] = useState(undefined);
	Electron.ipcRenderer.invoke('get-auth').then(data => {
        setAuthed((data !== undefined));
    });
	if (authed === true) {
		return (
			<div className='App'>
				<MessagesScreen/>
			</div>
		);
	} else if (authed === false) {
		return (
			<div className='App'>
				<SignInScreen authed={() => {setAuthed(true)}}/>
			</div>
		);
	}
}

export default App;
