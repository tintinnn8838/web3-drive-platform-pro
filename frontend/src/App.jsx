import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getPetra, connectPetraWallet, signMessage, submitTransaction
} from './lib/petra.js';
import {
  getNonce, verifySignature, fetchFiles, uploadFile, deleteFile,
  fetchFolders, createFolder, deleteFolder, getDownloadUrl,
  shareFile, updateOnChainStatus, fetchHealth, setToken, getToken
} from './lib/api.js';

// ── Icons (inline SVG) ──
const Icon = {
  Drive:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  Upload:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Folder:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  File:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Trash:    () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Share:    () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Download: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Plus:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Wallet:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Chain:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  X:        () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  List:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Grid:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
};

function fileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html')) return '💻';
  return '📄';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shorten(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString('vi-VN');
}

// ── Toast ──
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, toast: add };
}

// ── Modal: New Folder ──
function NewFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Tạo folder mới</div>
        <div className="form-group">
          <label className="form-label">Tên folder</label>
          <input
            className="form-input"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onCreate(name)}
            placeholder="vd: Documents"
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => onCreate(name)} disabled={!name.trim()}>Tạo</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Share File ──
function ShareModal({ file, onClose, onShare }) {
  const [addr, setAddr] = useState('');
  const [perm, setPerm] = useState('read');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Chia sẻ "{file.fileName}"</div>
        <div className="form-group">
          <label className="form-label">Địa chỉ ví Aptos</label>
          <input className="form-input" value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x..." />
        </div>
        <div className="form-group">
          <label className="form-label">Quyền</label>
          <select className="form-input" value={perm} onChange={e => setPerm(e.target.value)}>
            <option value="read">Chỉ đọc</option>
            <option value="write">Đọc & Ghi</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => onShare(addr, perm)} disabled={!addr.trim()}>Chia sẻ</button>
        </div>
      </div>
    </div>
  );
}

// ── Connect Screen ──
function ConnectScreen({ onConnect, loading }) {
  return (
    <div className="connect-screen">
      <h1>Web3<span> Drive</span><br />Platform Pro</h1>
      <p>Lưu trữ phi tập trung trên Aptos — file của bạn, on-chain metadata, Petra auth.</p>
      <div className="connect-card">
        <div className="connect-steps">
          {[
            ['Cài Petra Wallet', 'Extension Chrome tại petra.app'],
            ['Kết nối ví', 'Ký nonce để xác thực danh tính'],
            ['Upload & lưu trữ', 'File lên R2, metadata ghi on-chain'],
          ].map(([title, desc], i) => (
            <div className="connect-step" key={i}>
              <div className="step-num">{i + 1}</div>
              <div className="step-text"><strong>{title}</strong>{desc}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onConnect} disabled={loading}>
          {loading ? <><span className="spinner" /> Đang kết nối...</> : <><Icon.Wallet /> Kết nối Petra Wallet</>}
        </button>
        {!getPetra() && (
          <p style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 12, textAlign: 'center' }}>
            ⚠️ Petra chưa phát hiện — cài extension trước
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const { toasts, toast } = useToasts();
  const [walletAddress, setWalletAddress] = useState('');
  const [authed, setAuthed] = useState(!!getToken());
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // breadcrumb
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [modal, setModal] = useState(null); // null | 'newFolder' | { type:'share', file }
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  const refresh = useCallback(async () => {
    try {
      const [f, d] = await Promise.all([
        fetchFiles(currentFolder),
        fetchFolders(currentFolder),
      ]);
      setFiles(f.items || []);
      setFolders(d.folders || []);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [currentFolder]);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  useEffect(() => {
    fetchHealth().then(setHealthInfo).catch(() => {});
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const address = await connectPetraWallet();
      setWalletAddress(address);

      const { nonce, message } = await getNonce(address);
      const { signature } = await signMessage(address, message);
      const { token } = await verifySignature(address, signature, nonce);
      setToken(token);
      setAuthed(true);
      toast('Đã kết nối & xác thực thành công!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleUpload(fileObj) {
    if (!fileObj) return;
    setUploading(true);
    try {
      const { file: newFile } = await uploadFile({ file: fileObj, folderId: currentFolder });
      toast(`Đã upload "${newFile.fileName}"`, 'success');

      // Ghi metadata on-chain
      try {
        const MODULE = '0x_YOUR_MODULE_ADDRESS'; // thay bằng địa chỉ deploy thực
        const txHash = await submitTransaction({
          type: 'entry_function_payload',
          function: `${MODULE}::drive_metadata::add_file`,
          type_arguments: [],
          arguments: [newFile.blobId, newFile.fileName, newFile.mimeType, String(newFile.size)],
        });
        await updateOnChainStatus(newFile.id, txHash, 'confirmed');
        toast('Metadata đã ghi on-chain ✓', 'success');
      } catch {
        toast('Upload OK — ghi on-chain thất bại (contract chưa deploy)', 'info');
      }

      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file) {
    if (!confirm(`Xóa "${file.fileName}"?`)) return;
    try {
      await deleteFile(file.id);
      toast('Đã xóa file', 'success');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleDownload(file) {
    try {
      const { downloadUrl } = await getDownloadUrl(file.id);
      window.open(downloadUrl, '_blank');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleCreateFolder(name) {
    try {
      await createFolder(name, currentFolder);
      setModal(null);
      toast(`Đã tạo folder "${name}"`, 'success');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleDeleteFolder(folder) {
    if (!confirm(`Xóa folder "${folder.name}" và tất cả nội dung?`)) return;
    try {
      await deleteFolder(folder.id);
      toast('Đã xóa folder', 'success');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function openFolder(folder) {
    setCurrentFolder(folder.id);
    setFolderPath(p => [...p, folder]);
  }

  function navToBreadcrumb(idx) {
    if (idx === -1) { setCurrentFolder(null); setFolderPath([]); }
    else {
      const f = folderPath[idx];
      setCurrentFolder(f.id);
      setFolderPath(p => p.slice(0, idx + 1));
    }
  }

  async function handleShare(file, walletAddr, perm) {
    try {
      await shareFile(file.id, walletAddr, perm);
      setModal(null);
      toast(`Đã chia sẻ với ${shorten(walletAddr)}`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  // Drag-drop
  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  }

  if (!authed) return <ConnectScreen onConnect={handleConnect} loading={connecting} />;

  const storageUsed = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-dot" />
          WEB3 DRIVE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {healthInfo && (
            <span className={`chip ${healthInfo.storage === 'cloudflare-r2' ? 'green' : 'yellow'}`}>
              {healthInfo.storage === 'cloudflare-r2' ? '☁️ R2' : '⚠️ Local'}
            </span>
          )}
          <span className="chip blue"><Icon.Wallet />{shorten(walletAddress) || 'Đã auth'}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setToken(null); setAuthed(false); }}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="main">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Kho lưu trữ</div>
            <button className="sidebar-item active"><Icon.Drive /> Tất cả file <span className="count">{files.length}</span></button>
            <button className="sidebar-item"><Icon.Share /> Được chia sẻ</button>
          </div>
          <div className="divider" />
          <div className="sidebar-section">
            <div className="sidebar-label">Thông tin</div>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Đã dùng</div>
              <div style={{ fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 700 }}>{formatSize(storageUsed)}</div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, storageUsed / (1024 * 1024 * 1024) * 100)}%` }} />
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="content" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Tổng file</div>
              <div className="stat-value">{files.length}</div>
              <div className="stat-hint"><span className="stat-dot blue" />On backend</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">On-chain</div>
              <div className="stat-value">{files.filter(f => f.onChainStatus === 'confirmed').length}</div>
              <div className="stat-hint"><span className="stat-dot green" />Confirmed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Folders</div>
              <div className="stat-value">{folders.length}</div>
              <div className="stat-hint"><span className="stat-dot blue" />Hiện tại</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Dung lượng</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{formatSize(storageUsed)}</div>
              <div className="stat-hint"><span className="stat-dot yellow" />Tổng cộng</div>
            </div>
          </div>

          {/* Header */}
          <div className="content-header">
            <div>
              <div className="breadcrumb">
                <span onClick={() => navToBreadcrumb(-1)} style={{ cursor: 'pointer', color: 'var(--accent2)' }}>Trang chủ</span>
                {folderPath.map((f, i) => (
                  <><span className="breadcrumb-sep">/</span>
                  <span key={f.id} onClick={() => navToBreadcrumb(i)} style={{ cursor: 'pointer', color: i === folderPath.length - 1 ? 'var(--text)' : 'var(--accent2)' }}>{f.name}</span></>
                ))}
              </div>
              <div className="content-title">{currentFolder ? folderPath.at(-1)?.name : 'Tất cả file'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-icon btn-ghost" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} title="Chuyển view">
                {viewMode === 'grid' ? <Icon.List /> : <Icon.Grid />}
              </button>
            </div>
          </div>

          {/* Action bar */}
          <div className="action-bar">
            <label className="btn btn-upload">
              {uploading ? <><span className="spinner" /> Uploading...</> : <><Icon.Upload /> Upload file</>}
              <input type="file" ref={fileInputRef} onChange={e => { handleUpload(e.target.files[0]); e.target.value = ''; }} disabled={uploading} />
            </label>
            <button className="btn btn-secondary" onClick={() => setModal('newFolder')}>
              <Icon.Plus /><Icon.Folder /> New Folder
            </button>
          </div>

          {/* Folders */}
          {folders.length > 0 && (
            <div className="folder-grid" style={{ marginBottom: 20 }}>
              {folders.map(folder => (
                <div key={folder.id} className="folder-item" onDoubleClick={() => openFolder(folder)}>
                  📁 {folder.name}
                  <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 4 }}>{folder._count?.files || 0}</span>
                  <button className="btn btn-icon btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                    <Icon.Trash />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone / Empty state */}
          {files.length === 0 && !uploading ? (
            <div className={`drop-zone ${dragging ? 'dragging' : ''}`}>
              <div className="drop-zone-icon">📂</div>
              <h3>Kéo file vào đây hoặc nhấn Upload</h3>
              <p>Hỗ trợ tất cả loại file · Tối đa 100MB</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-grid">
              {files.map(file => (
                <div key={file.id} className="file-card">
                  <div className="file-icon">{fileIcon(file.mimeType)}</div>
                  <div className="file-name truncate" title={file.fileName}>{file.fileName}</div>
                  <div className="file-meta">{formatSize(file.size)}</div>
                  <div className={`file-status ${file.onChainStatus}`}>{file.onChainStatus}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Tải xuống" onClick={() => handleDownload(file)}><Icon.Download /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Chia sẻ" onClick={() => setModal({ type: 'share', file })}><Icon.Share /></button>
                    <button className="btn btn-danger btn-icon btn-sm" title="Xóa" onClick={() => handleDelete(file)}><Icon.Trash /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="file-list">
              <div className="file-list-header">
                <span>Tên file</span><span>Kích thước</span><span>On-chain</span><span>Ngày tải</span><span>Thao tác</span>
              </div>
              {files.map(file => (
                <div key={file.id} className="file-list-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{fileIcon(file.mimeType)}</span>
                    <span className="truncate">{file.fileName}</span>
                  </span>
                  <span style={{ color: 'var(--text2)' }}>{formatSize(file.size)}</span>
                  <span><span className={`file-status ${file.onChainStatus}`}>{file.onChainStatus}</span></span>
                  <span style={{ color: 'var(--text2)', fontSize: 12 }}>{timeAgo(file.createdAt)}</span>
                  <span style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownload(file)}><Icon.Download /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({ type: 'share', file })}><Icon.Share /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(file)}><Icon.Trash /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {modal === 'newFolder' && <NewFolderModal onClose={() => setModal(null)} onCreate={handleCreateFolder} />}
      {modal?.type === 'share' && (
        <ShareModal file={modal.file} onClose={() => setModal(null)}
          onShare={(addr, perm) => handleShare(modal.file, addr, perm)} />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}
