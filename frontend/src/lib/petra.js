export function getPetra() {
  return window?.aptos || null;
}

export async function connectPetraWallet() {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài. Tải tại petra.app');
  const response = await petra.connect();
  return response?.address || '';
}

export async function signMessage(address, message) {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài');

  const nonce = crypto.randomUUID().slice(0, 8);
  const result = await petra.signMessage({ message, nonce });
  return { signature: result?.signature || '', nonce, fullMessage: result?.fullMessage || message };
}

export async function submitTransaction(payload) {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài');
  const pendingTx = await petra.signAndSubmitTransaction(payload);
  return pendingTx?.hash || pendingTx;
}
