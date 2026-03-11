export function getPetra() {
  return window?.aptos || null;
}

export async function connectPetraWallet() {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài. Tải tại petra.app');
  const response = await petra.connect();
  return response?.address || '';
}

export async function getConnectedAddress() {
  const petra = getPetra();
  if (!petra) return '';

  try {
    const response = await petra.account();
    return response?.address || '';
  } catch {
    return '';
  }
}

export async function signMessage(message) {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài');

  const result = await petra.signMessage({ message, nonce: 'web3drive' });
  return {
    signature: result?.signature || '',
    publicKey: result?.publicKey || '',
    fullMessage: result?.fullMessage || message,
  };
}

export async function submitTransaction(payload) {
  const petra = getPetra();
  if (!petra) throw new Error('Petra Wallet chưa cài');
  const pendingTx = await petra.signAndSubmitTransaction(payload);
  return pendingTx?.hash || pendingTx;
}
