// Encryption utility for localStorage data
// Uses Web Crypto API for AES-GCM encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

// Generate a key from a password using PBKDF2
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Get or create a salt from localStorage
function getOrCreateSalt() {
  const SALT_KEY = 'encryption_salt';
  let salt = localStorage.getItem(SALT_KEY);
  
  if (!salt) {
    // Generate a new salt
    const saltArray = new Uint8Array(16);
    crypto.getRandomValues(saltArray);
    salt = Array.from(saltArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(SALT_KEY, salt);
  }
  
  // Convert hex string back to Uint8Array
  const saltArray = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return saltArray;
}

// Encrypt data
export async function encryptData(data) {
  try {
    const salt = getOrCreateSalt();
    const password = window.location.hostname + 'group_encryption_key'; // Use hostname as part of key
    const key = await deriveKey(password, salt);
    
    // Generate IV
    const iv = new Uint8Array(IV_LENGTH);
    crypto.getRandomValues(iv);
    
    // Convert data to string and encode
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...combined));
    return base64;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

// Decrypt data
export async function decryptData(encryptedBase64) {
  try {
    const salt = getOrCreateSalt();
    const password = window.location.hostname + 'group_encryption_key'; // Use hostname as part of key
    const key = await deriveKey(password, salt);
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    );
    
    // Convert back to string and parse JSON
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}
