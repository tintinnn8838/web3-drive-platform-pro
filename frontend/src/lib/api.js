const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

let _token = localStorage.getItem('w3d_token') || null;

export function setToken(token) {
  _token = token;
  if (token) localStorage.setItem('w3d_token', token);
  else localStorage.removeItem('w3d_token');
}

export function getToken() { return _token; }

function authHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Lỗi không xác định');
  }
  return res.json();
}

// Auth
export async function getNonce(walletAddress) {
  return handleResponse(await fetch(`${API_BASE}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  }));
}

export async function verifySignature(walletAddress, signature, nonce) {
  return handleResponse(await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, signature, nonce }),
  }));
}

export async function getMe() {
  return handleResponse(await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  }));
}

// Health
export async function fetchHealth() {
  return handleResponse(await fetch(`${API_BASE}/health`));
}

// Files
export async function fetchFiles(folderId = null) {
  const params = folderId ? `?folderId=${folderId}` : '';
  return handleResponse(await fetch(`${API_BASE}/api/files${params}`, {
    headers: authHeaders(),
  }));
}

export async function uploadFile({ file, folderId = null }) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  return handleResponse(await fetch(`${API_BASE}/api/files/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  }));
}

export async function deleteFile(id) {
  return handleResponse(await fetch(`${API_BASE}/api/files/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}

export async function getDownloadUrl(id) {
  return handleResponse(await fetch(`${API_BASE}/api/files/${id}/download`, {
    headers: authHeaders(),
  }));
}

export async function shareFile(id, walletAddress, permission = 'read') {
  return handleResponse(await fetch(`${API_BASE}/api/files/${id}/share`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, permission }),
  }));
}

export async function updateOnChainStatus(id, txHash, status) {
  return handleResponse(await fetch(`${API_BASE}/api/files/${id}/onchain`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, status }),
  }));
}

// Folders
export async function fetchFolders(parentId = null) {
  const params = parentId ? `?parentId=${parentId}` : '';
  return handleResponse(await fetch(`${API_BASE}/api/folders${params}`, {
    headers: authHeaders(),
  }));
}

export async function createFolder(name, parentId = null) {
  return handleResponse(await fetch(`${API_BASE}/api/folders`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  }));
}

export async function deleteFolder(id) {
  return handleResponse(await fetch(`${API_BASE}/api/folders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}
