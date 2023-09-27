import { useState } from 'react';
import Crypto from "./Crypto.js"
import { TextField } from '@mui/material';
const Electron = require("electron");

function SignInScreen(props) {
	async function sign_in(email, password) {
        let basic_auth_json = {
            email: email,
            password: password,
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
            props.authed();
        } else {
            return ids_res;
        }
	};
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
	function handleEmailChange(e) {
		setEmail(e.target.value);
	}
    function handlePasswordChange(e) {
		setPassword(e.target.value);
	}

	return (
		<div className="SignInScreen">
            <h1>Login or Create Account</h1>
            <TextField className='emailInput' label="Email" variant="standard" onChange={handleEmailChange}/>
            <br/>
            <TextField className='passwordInput' label="Password" variant="standard" onChange={handlePasswordChange}/>
            <br/>
            <button onClick={() => {sign_in(email, password)}}>
                <span>Login</span>
            </button>
        </div>
	);
}

export default SignInScreen;
