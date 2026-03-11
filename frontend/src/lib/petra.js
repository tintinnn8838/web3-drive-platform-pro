export async function signMessageWithWallet(wallet, message, nonce) {
  if (!wallet?.signMessage) {
    throw new Error('Ví hiện tại chưa hỗ trợ signMessage');
  }

  const response = await wallet.signMessage({
    message,
    nonce,
  });

  return {
    signature: response?.signature || '',
    fullMessage: response?.fullMessage || message,
    nonce,
    message,
  };
}

export async function submitTransactionWithWallet(wallet, payload) {
  if (!wallet?.signAndSubmitTransaction) {
    throw new Error('Ví hiện tại chưa hỗ trợ signAndSubmitTransaction');
  }

  const pendingTx = await wallet.signAndSubmitTransaction({ payload });
  return pendingTx?.hash || pendingTx;
}
