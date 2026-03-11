import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { signMessageWithWallet, submitTransactionWithWallet } from './lib/petra.js';
import {
  createFolder, deleteFile, deleteFolder, fetchFiles, fetchFolders, fetchHealth,
  getDownloadUrl, getMe, getNonce, getToken, setToken, shareFile, updateOnChainStatus,
  uploadFile, verifySignature,
} from './lib/api.js';

const Icon = {
  Upload: () => <span>⬆️</span>, Folder: () => <span>📁</span>, Wallet: () => <span>👛</span>,
  Trash: () => <span>🗑️</span>, Share: () => <span>🤝</span>, Download: () => <span>⬇️</span>, Plus: () => <span>➕</span>,
};

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, msg, type }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

function ConnectScreen({ onConnect, onSignIn, loading, authError, petraInstalled, connected, walletAddress }) {
  return (
    <div className="connect-screen">
      <h1>Web3<span> Drive</span><br />Platform Pro</h1>
      <p>MVP lưu file theo folder với Petra auth, backend JWT và local/R2 storage.</p>
      <div className="connect-card">
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onConnect} disabled={loading || connected}>
          {connected ? <>✅ Petra đã kết nối</> : loading ? 'Đang kết nối...' : <><Icon.Wallet /> Kết nối Petra Wallet</>}
        </button>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 12 }} onClick={onSignIn} disabled={loading || !connected}>
          {loading ? 'Đang xác thực...' : 'Ký message / Đăng nhập ví'}
        </button>
        {walletAddress && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 12, textAlign: 'center' }}>Ví: {shorten(walletAddress)}</p>}
        {!petraInstalled && <p style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 12, textAlign: 'center' }}>⚠️ Chưa phát hiện Petra extension</p>}
        {authError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 12, textAlign: 'center' }}>{authError}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const { toasts, toast } = useToasts();
  const {
    connect,
    disconnect,
    account,
    connected,
    wallet,
    signMessage,
    signAndSubmitTransaction,
    wallets,
  } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyFolder, setBusyFolder] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [me, setMe] = useState(null);
  const [shareState, setShareState] = useState({ open: false, file: null, walletAddress: '', permission: 'read' });
  const [authenticating, setAuthenticating] = useState(false);
  const fileInputRef = useRef(null);

  const petraInstalled = useMemo(() => wallets.some((item) => item.name?.toLowerCase().includes('petra')), [wallets]);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setLoadingData(true);
    try {
      const [fileRes, folderRes, meRes] = await Promise.all([
        fetchFiles(currentFolder),
        fetchFolders(currentFolder),
        getMe(),
      ]);
      setFiles(fileRes.items || []);
      setFolders(folderRes.folders || []);
      setMe(meRes);
      if (!walletAddress && meRes?.walletAddress) setWalletAddress(meRes.walletAddress);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [currentFolder, toast, walletAddress]);

  useEffect(() => {
    fetchHealth().then(setHealthInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  useEffect(() => {
    if (account?.address) {
      setWalletAddress(account.address.toString().toLowerCase());
    }
  }, [account]);

  async function handleConnect() {
    setConnecting(true);
    setAuthError('');

    try {
      const petraWallet = wallets.find((item) => item.name?.toLowerCase().includes('petra'));
      if (!petraWallet) throw new Error('Chưa tìm thấy Petra Wallet');
      await connect(petraWallet.name);
      toast('Đã kết nối Petra. Bấm "Ký message / Đăng nhập ví" để xác thực.', 'info');
    } catch (error) {
      setAuthError(error.message || 'Kết nối Petra thất bại');
      toast(error.message || 'Kết nối Petra thất bại', 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSignIn() {
    if (authenticating) return;

    try {
      if (!connected || !account?.address) throw new Error('Cần kết nối Petra trước');

      setAuthenticating(true);
      setAuthError('');
      const address = account.address.toString().toLowerCase();
      setWalletAddress(address);

      const nonceRes = await getNonce(address);
      const signed = await signMessageWithWallet({ signMessage }, nonceRes.message, nonceRes.nonce);
      const verifyRes = await verifySignature({
        walletAddress: address,
        nonce: nonceRes.nonce,
        signature: signed.signature,
        publicKey: signed.publicKey,
        fullMessage: signed.fullMessage,
      });

      setToken(verifyRes.token);
      setAuthed(true);
      toast('Xác thực ví thành công', 'success');
    } catch (error) {
      setAuthError(error.message || 'Xác thực ví thất bại');
      toast(error.message || 'Xác thực ví thất bại', 'error');
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleCreateFolder() {
    const name = window.prompt('Tên folder mới');
    if (!name?.trim()) return;
    setBusyFolder(true);
    try {
      await createFolder(name.trim(), currentFolder);
      toast('Đã tạo folder', 'success');
      await refresh();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusyFolder(false);
    }
  }

  async function handleUpload(fileObj) {
    if (!fileObj) return;
    setUploading(true);
    try {
      const { file: newFile } = await uploadFile({ file: fileObj, folderId: currentFolder });
      toast(`Đã upload ${newFile.fileName}`, 'success');

      try {
        const MODULE = import.meta.env.VITE_APTOS_MODULE_ADDRESS;
        if (!MODULE) throw new Error('missing module');
        const txHash = await submitTransactionWithWallet({ signAndSubmitTransaction }, {
          type: 'entry_function_payload',
          function: `${MODULE}::drive_metadata::add_file`,
          type_arguments: [],
          arguments: [newFile.blobId, newFile.fileName, newFile.mimeType, String(newFile.size)],
        });
        await updateOnChainStatus(newFile.id, txHash, 'confirmed');
        toast('Đã cập nhật on-chain status', 'success');
      } catch {
        toast('Upload xong, chưa ghi on-chain (thiếu module hoặc tx lỗi)', 'info');
      }

      await refresh();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(file) {
    if (!window.confirm(`Xóa file ${file.fileName}?`)) return;
    try {
      await deleteFile(file.id);
      toast('Đã xóa file', 'success');
      await refresh();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function handleDeleteFolder(folder) {
    if (!window.confirm(`Xóa folder ${folder.name}?`)) return;
    try {
      await deleteFolder(folder.id);
      if (currentFolder === folder.id) {
        setCurrentFolder(null);
        setFolderPath([]);
      }
      toast('Đã xóa folder', 'success');
      await refresh();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function handleDownload(file) {
    try {
      const result = await getDownloadUrl(file.id);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function handleShareSubmit() {
    try {
      await shareFile(shareState.file.id, shareState.walletAddress, shareState.permission);
      toast('Đã chia sẻ file', 'success');
      setShareState({ open: false, file: null, walletAddress: '', permission: 'read' });
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const storageUsed = useMemo(() => files.reduce((sum, item) => sum + (item.size || 0), 0), [files]);

  async function logout() {
    setToken(null);
    setAuthed(false);
    setWalletAddress('');
    setMe(null);
    setFiles([]);
    setFolders([]);
    setFolderPath([]);
    setCurrentFolder(null);
    try {
      if (connected) await disconnect();
    } catch {}
  }

  function openFolder(folder) {
    setCurrentFolder(folder.id);
    setFolderPath((prev) => [...prev, folder]);
  }

  function navTo(index) {
    if (index < 0) {
      setCurrentFolder(null);
      setFolderPath([]);
      return;
    }
    setCurrentFolder(folderPath[index].id);
    setFolderPath((prev) => prev.slice(0, index + 1));
  }

  if (!authed) {
    return (
      <ConnectScreen
        onConnect={handleConnect}
        onSignIn={handleSignIn}
        loading={connecting || authenticating}
        authError={authError}
        petraInstalled={petraInstalled}
        connected={connected}
        walletAddress={walletAddress}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">WEB3 DRIVE MVP</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {healthInfo && <span className={`chip ${healthInfo.storage === 'cloudflare-r2' ? 'green' : 'yellow'}`}>{healthInfo.storage}</span>}
          {healthInfo && <span className="chip blue">{healthInfo.database}</span>}
          <span className="chip blue">{shorten(walletAddress || me?.walletAddress)}</span>
          <a
            href="https://docs.shelby.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            Documentation
          </a>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      <div className="main">
        <nav className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Tài khoản</div>
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text2)' }}>
              <div>Folders: {me?._count?.folders ?? 0}</div>
              <div>Files: {me?._count?.files ?? 0}</div>
              <div>Storage: {formatSize(storageUsed)}</div>
            </div>
          </div>
        </nav>

        <main className="content">
          <div className="content-header">
            <div>
              <div className="breadcrumb">
                <span onClick={() => navTo(-1)} style={{ cursor: 'pointer' }}>Trang chủ</span>
                {folderPath.map((folder, index) => (
                  <span key={folder.id}> / <span onClick={() => navTo(index)} style={{ cursor: 'pointer' }}>{folder.name}</span></span>
                ))}
              </div>
              <div className="content-title">{folderPath.at(-1)?.name || 'Tất cả file'}</div>
            </div>
            <button className="btn btn-secondary" onClick={refresh} disabled={loadingData}>{loadingData ? 'Đang tải...' : 'Làm mới'}</button>
          </div>

          <div className="action-bar">
            <label className="btn btn-upload">
              {uploading ? 'Uploading...' : <><Icon.Upload /> Upload file</>}
              <input type="file" ref={fileInputRef} onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} disabled={uploading} />
            </label>
            <button className="btn btn-secondary" onClick={handleCreateFolder} disabled={busyFolder}><Icon.Plus /><Icon.Folder /> New Folder</button>
          </div>

          {loadingData && <div className="drop-zone"><p>Đang tải dữ liệu...</p></div>}

          {!loadingData && folders.length > 0 && (
            <div className="folder-grid" style={{ marginBottom: 20 }}>
              {folders.map((folder) => (
                <div key={folder.id} className="folder-item" onDoubleClick={() => openFolder(folder)}>
                  📁 {folder.name}
                  <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 4 }}>
                    {folder._count?.files || 0} files · {folder._count?.children || 0} folders
                  </span>
                  <button className="btn btn-icon btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                    <Icon.Trash />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loadingData && files.length === 0 && folders.length === 0 && (
            <div className="drop-zone">
              <div className="drop-zone-icon">📂</div>
              <h3>Chưa có dữ liệu</h3>
              <p>Tạo folder hoặc upload file để bắt đầu.</p>
            </div>
          )}

          {!loadingData && files.length > 0 && (
            <div className="file-list">
              <div className="file-list-header">
                <span>Tên file</span><span>Kích thước</span><span>On-chain</span><span>Thao tác</span>
              </div>
              {files.map((file) => (
                <div key={file.id} className="file-list-row">
                  <span>{file.fileName}</span>
                  <span>{formatSize(file.size)}</span>
                  <span>{file.onChainStatus}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownload(file)}><Icon.Download /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShareState({ open: true, file, walletAddress: '', permission: 'read' })}><Icon.Share /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteFile(file)}><Icon.Trash /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {shareState.open && (
        <div className="modal-overlay" onClick={() => setShareState({ open: false, file: null, walletAddress: '', permission: 'read' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Chia sẻ {shareState.file?.fileName}</div>
            <div className="form-group">
              <label className="form-label">Ví đích</label>
              <input className="form-input" value={shareState.walletAddress} onChange={(e) => setShareState((prev) => ({ ...prev, walletAddress: e.target.value }))} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label className="form-label">Permission</label>
              <select className="form-input" value={shareState.permission} onChange={(e) => setShareState((prev) => ({ ...prev, permission: e.target.value }))}>
                <option value="read">read</option>
                <option value="write">write</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShareState({ open: false, file: null, walletAddress: '', permission: 'read' })}>Hủy</button>
              <button className="btn btn-primary" onClick={handleShareSubmit}>Chia sẻ</button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((item) => <div key={item.id} className={`toast ${item.type}`}>{item.msg}</div>)}
      </div>
    </div>
  );
}
