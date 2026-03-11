import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadToStorage, uploadToLocalStorage, deleteFromStorage, getPresignedDownloadUrl,
  isR2Configured, resolveLocalStoragePath,
} from '../lib/storage.js';
import {
  listFiles, findFolderById, createFile, findReadableFile, findOwnedFile,
  deleteFileRecord, updateFileOnChain, findUserByWallet, upsertFileShare,
} from '../lib/repository.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.get('/', requireAuth, async (req, res) => {
  try {
    const files = await listFiles(req.user.id, req.query.folderId || null);
    res.json({ items: files, total: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không tải được danh sách file' });
  }
});

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Thiếu file upload' });

    const folderId = req.body.folderId || null;
    if (folderId) {
      const folder = await findFolderById(folderId, req.user.id);
      if (!folder) return res.status(404).json({ error: 'Folder không tồn tại' });
    }

    const blobId = `blob_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${req.user.id}/${blobId}/${safeName}`;

    const storageResult = isR2Configured()
      ? await uploadToStorage(storageKey, req.file.buffer, req.file.mimetype)
      : await uploadToLocalStorage(storageKey, req.file.buffer);

    const file = await createFile({
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      ownerId: req.user.id,
      folderId,
      storageKey: storageResult.storageKey,
      storageUrl: storageResult.storageUrl,
      blobId,
      onChainStatus: 'pending',
    });

    res.status(201).json({ ok: true, file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload thất bại' });
  }
});

router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await findReadableFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: 'File không tồn tại hoặc không có quyền' });

    if (isR2Configured()) {
      const url = await getPresignedDownloadUrl(file.storageKey);
      return res.json({ downloadUrl: url, expiresIn: 3600, mode: 'presigned' });
    }

    const filePath = resolveLocalStoragePath(file.storageKey);
    return res.download(filePath, file.fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải file' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await findOwnedFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: 'File không tồn tại' });

    await deleteFromStorage(file.storageKey);
    await deleteFileRecord(file.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
});

router.patch('/:id/onchain', requireAuth, async (req, res) => {
  try {
    const { txHash, status } = req.body;
    if (!txHash || !status) return res.status(400).json({ error: 'Thiếu txHash hoặc status' });

    const file = await updateFileOnChain(req.params.id, req.user.id, { txHash, status });
    if (!file) return res.status(404).json({ error: 'File không tồn tại' });

    res.json({ ok: true, file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cập nhật on-chain thất bại' });
  }
});

router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || '').trim().toLowerCase();
    const permission = req.body.permission === 'write' ? 'write' : 'read';
    if (!walletAddress) return res.status(400).json({ error: 'Thiếu walletAddress người nhận' });

    const file = await findOwnedFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: 'File không tồn tại' });

    const targetUser = await findUserByWallet(walletAddress);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng chưa có tài khoản' });

    const share = await upsertFileShare(file.id, targetUser.id, permission);
    res.json({ ok: true, share });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chia sẻ file thất bại' });
  }
});

export default router;
