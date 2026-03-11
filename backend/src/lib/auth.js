import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const { decodeBase64, decodeUTF8 } = naclUtil;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function buildAuthMessage(walletAddress, nonce) {
  return [
    'Web3Drive Authentication',
    `Address: ${String(walletAddress).trim().toLowerCase()}`,
    `Nonce: ${nonce}`,
    'Sign this message to continue.',
  ].join('\n');
}

export function verifyAptosSignature({ signature, publicKey, fullMessage }) {
  if (!signature || !publicKey || !fullMessage) return false;

  try {
    const sig = decodeBase64(signature);
    const pub = decodeBase64(publicKey);
    const msg = decodeUTF8(fullMessage);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
