const { subtle } = require('node:crypto').webcrypto;

async function encrypt_message(message, key) {
	message.text = await encrypt(key, message.text);
	return message;
}

async function decrypt_message(message, key) {
	message.text = await decrypt(key, message.text);
	return message;
}

async function generateKeyPair() {
	const keyPair = await generateRSAKeyPair();
	return { publicKey: await exportRSAPublicKeyAsString(keyPair.publicKey), privateKey: await exportRSAPrivateKeyAsString(keyPair.privateKey) };
}

async function encrypt(publicKey, plaintext) {
	let publicKeyObject = await importRSAPublicKeyFromString(publicKey);
	return await encryptDataWithRSAPublicKey(plaintext, publicKeyObject);
}

async function decrypt(privateKey, encryptedText) {
	let privateKeyObject = await importRSAPrivateKeyFromString(privateKey);
	return await decryptDataWithRSAPrivateKey(encryptedText, privateKeyObject);
}

async function encryptAsArray(publicKey, plaintext) {
	let publicKeyObject = await importRSAPublicKeyFromString(publicKey);
	return await encryptDataWithRSAPublicKeyAsArray(plaintext, publicKeyObject);
}

async function decryptAsArray(privateKey, encryptedText) {
	let privateKeyObject = await importRSAPrivateKeyFromString(privateKey);
	return await decryptDataWithRSAPrivateKeyAsArray(encryptedText, privateKeyObject);
}

async function test() {
	const plaintext = "Hello World!";
    console.log(`plain text ${plaintext}`);
	const keyPair = await generateKeyPair();
	console.log(`Public key: ${keyPair.publicKey}`);
	console.log(`Private key: ${keyPair.privateKey}`);

	const encryptedText = await encrypt(keyPair.publicKey, plaintext);
	console.log(`Encrypted text: ${encryptedText}`);

	const decryptedText = await decrypt(keyPair.privateKey, encryptedText);
	console.log(`Decrypted text: ${decryptedText}`);
}

module.exports = { generateKeyPair, decrypt_message, encrypt_message, test, encrypt, decrypt, base64ToArrayBuffer, encryptAsArray, decryptAsArray };

// Generate RSA key pair
const generateRSAKeyPair = async () => {
	const keyPair = await subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 2048,
			publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
			hash: "SHA-256",
		},
		true,
		["encrypt", "decrypt"]
	);
	return keyPair;
};

const arrayBufferToHexString = (arrayBuffer) => {
	const uint8Array = new Uint8Array(arrayBuffer);
	const hexStringArray = [];
	uint8Array.forEach((byte) => {
		const hexString = byte.toString(16).padStart(2, "0");
		hexStringArray.push(hexString);
	});
	return hexStringArray.join("");
};

const hexStringToArrayBuffer = (hexString) => {
	const strippedString = hexString.replace(/[^A-Fa-f0-9]/g, "");
	const byteLength = strippedString.length / 2;
	const uint8Array = new Uint8Array(byteLength);
	for (let i = 0; i < byteLength; ++i) {
		const byteString = strippedString.substr(i * 2, 2);
		uint8Array[i] = parseInt(byteString, 16);
	}
	return uint8Array.buffer;
};

const hexStringToUint8 = (hexString) => {
	const strippedString = hexString.replace(/[^A-Fa-f0-9]/g, "");
	const byteLength = strippedString.length / 2;
	const uint8Array = new Uint8Array(byteLength);
	for (let i = 0; i < byteLength; ++i) {
		const byteString = strippedString.substr(i * 2, 2);
		uint8Array[i] = parseInt(byteString, 16);
	}
	return uint8Array;
};

function base64ToArrayBuffer(base64String) {
    const binaryString = Buffer.from(base64String, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Export RSA public key as a string
const exportRSAPublicKeyAsString = async (publicKey) => {
	const exportedKey = await subtle.exportKey(
		"spki",
		publicKey
	);
	const exportedKeyString = Buffer.from(exportedKey).toString('base64');
	return exportedKeyString;
};

// Export RSA private key as a string
const exportRSAPrivateKeyAsString = async (privateKey) => {
	const exportedKey = await subtle.exportKey(
		"pkcs8",
		privateKey
	);
	const exportedKeyString = Buffer.from(exportedKey).toString('base64');
	return exportedKeyString;
};

// Import RSA public key from string
const importRSAPublicKeyFromString = async (keyString) => {
	const keyBuffer = base64ToArrayBuffer(keyString);
	const publicKey = await subtle.importKey(
		"spki",
		keyBuffer,
		{
			name: "RSA-OAEP",
			hash: "SHA-256",
		},
		true,
		["encrypt"]
	);
	return publicKey;
};

// Import RSA private key from string
const importRSAPrivateKeyFromString = async (keyString) => {
	const keyBuffer = base64ToArrayBuffer(keyString);
	const privateKey = await subtle.importKey(
		"pkcs8",
		keyBuffer,
		{
			name: "RSA-OAEP",
			hash: "SHA-256",
		},
		true,
		["decrypt"]
	);
	return privateKey;
};

// Encrypt data using RSA public key
const encryptDataWithRSAPublicKey = async (data, publicKey) => {
	const blockSize = 190; // Maximum RSA block size is 190 bytes for OAEP padding
	const dataBytes = new TextEncoder().encode(data);
	const encryptedBlocks = [];
	let offset = 0;
	while (offset < dataBytes.length) {
		const block = dataBytes.slice(offset, Math.min(offset + blockSize, dataBytes.length));
		const encryptedBlock = await subtle.encrypt(
			{
				name: "RSA-OAEP",
			},
			publicKey,
			block
		);
		encryptedBlocks.push(encryptedBlock);
		offset += blockSize;
	}
	const encryptedData = new Uint8Array(
		encryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	encryptedBlocks.forEach((block) => {
		encryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	const encryptedDataString = Buffer.from(encryptedData).toString('base64');
	return encryptedDataString;
};

const decryptDataWithRSAPrivateKey = async (encryptedDataString, privateKey) => {
	const encryptedData = base64ToArrayBuffer(encryptedDataString);
	const blockSize = privateKey.algorithm.modulusLength / 8;
	const numBlocks = Math.ceil(encryptedData.byteLength / blockSize);
	const decryptedBlocks = [];
	for (let i = 0; i < numBlocks; i++) {
		const blockOffset = i * blockSize;
		const block = encryptedData.slice(blockOffset, blockOffset + blockSize);
		const decryptedBlock = await subtle.decrypt(
			{
				name: "RSA-OAEP",
			},
			privateKey,
			block
		);
		decryptedBlocks.push(decryptedBlock);
	}
	const decryptedData = new Uint8Array(
		decryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	decryptedBlocks.forEach((block) => {
		decryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	const decryptedDataString = new TextDecoder().decode(decryptedData);
	return decryptedDataString;
};

const encryptDataWithRSAPublicKeyAsArray = async (data, publicKey) => {
	const blockSize = 190; // Maximum RSA block size is 190 bytes for OAEP padding
	const dataBytes = new TextEncoder().encode(data);
	const encryptedBlocks = [];
	let offset = 0;
	while (offset < dataBytes.length) {
		const block = dataBytes.slice(offset, offset + blockSize);
		const encryptedBlock = await subtle.encrypt(
			{
				name: "RSA-OAEP",
			},
			publicKey,
			block
		);
		encryptedBlocks.push(encryptedBlock);
		offset += blockSize;
	}
	const encryptedData = new Uint8Array(
		encryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	encryptedBlocks.forEach((block) => {
		encryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	return encryptedData;
};

const decryptDataWithRSAPrivateKeyAsArray = async (encryptedDataString, privateKey) => {
	const encryptedData = base64ToArrayBuffer(encryptedDataString);
	const blockSize = privateKey.algorithm.modulusLength / 8;
	const numBlocks = Math.ceil(encryptedData.byteLength / blockSize);
	const decryptedBlocks = [];
	for (let i = 0; i < numBlocks; i++) {
		const blockOffset = i * blockSize;
		const block = encryptedData.slice(blockOffset, blockOffset + blockSize);
		const decryptedBlock = await subtle.decrypt(
			{
				name: "RSA-OAEP",
			},
			privateKey,
			block
		);
		decryptedBlocks.push(decryptedBlock);
	}
	const decryptedData = new Uint8Array(
		decryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	decryptedBlocks.forEach((block) => {
		decryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	return decryptedData;
};