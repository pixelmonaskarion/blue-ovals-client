import './App.css';
import { useEffect } from 'react';
import Crypto from "./Crypto.js"
const Electron = require("electron");

function App() {
  useEffect(() => {
    ( async () => {
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
        Electron.ipcRenderer.invoke('save-auth', full_auth_json);
      } else {
        throw ids_res.error;
      }
    })();
  }, []);
  return (
    <div className="App">
      <h1>Hi Ben you should do some ui 👍️👍️</h1>
    </div>
  );
}

export default App;
