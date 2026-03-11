import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadToStorage, uploadToLocalStorage, deleteFromStorage, getPresignedDownloadUrl, isR2Configured } from '../lib/storage.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// GET /api/files - Lấy danh sách file của user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.query;

    const files = await prisma.file.findMany({
      where: {
        ownerId: req.user.id,
        folderId: folderId || null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fileName: true, mimeType: true, size: true,
        blobId: true, onChainStatus: true, onChainTxHash: true,
        isPublic: true, createdAt: true, folderId: true,
        storageUrl: true,
      },
    });

    res.json({ items: files, total: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không tải được danh sách file' });
  }
});

// POST /api/files/upload - Upload file mới
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Thiếu file upload' });

    const { folderId } = req.body;
    const blobId = `blob_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const storageKey = `${req.user.id}/${blobId}/${req.file.originalname}`;

    // Upload lên R2 nếu có config, fallback về local
    let storageResult;
    if (isR2Configured()) {
      storageResult = await uploadToStorage(storageKey, req.file.buffer, req.file.mimetype);
    } else {
      storageResult = await uploadToLocalStorage(blobId, req.file.buffer);
    }

    // Kiểm tra folder thuộc về user nếu có
    if (folderId) {
      const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId: req.user.id } });
      if (!folder) return res.status(404).json({ error: 'Folder không tồn tại' });
    }

    const file = await prisma.file.create({
      data: {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        ownerId: req.user.id,
        folderId: folderId || null,
        storageKey: storageResult.storageKey,
        storageUrl: storageResult.storageUrl,
        blobId,
        onChainStatus: 'pending',
      },
    });

    res.status(201).json({ ok: true, file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload thất bại' });
  }
});

// GET /api/files/:id/download - Tải file (presigned URL hoặc local)
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.user.id },
          { shares: { some: { sharedWithId: req.user.id } } },
          { isPublic: true },
        ],
      },
    });

    if (!file) return res.status(404).json({ error: 'File không tồn tại hoặc không có quyền' });

    if (isR2Configured()) {
      const url = await getPresignedDownloadUrl(file.storageKey);
      return res.json({ downloadUrl: url, expiresIn: 3600 });
    }

    // Local fallback
    import('path').then(({ default: path }) => {
      import('url').then(({ fileURLToPath }) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const filePath = path.resolve(__dirname, '../../data/blobs', file.storageKey);
        res.download(filePath, file.fileName);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải file' });
  }
});

// DELETE /api/files/:id - Xóa file
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });

    if (!file) return res.status(404).json({ error: 'File không tồn tại' });

    if (isR2Configured()) {
      await deleteFromStorage(file.storageKey);
    }

    await prisma.file.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
});

// PATCH /api/files/:id/onchain - Cập nhật trạng thái on-chain sau khi ghi contract
router.patch('/:id/onchain', requireAuth, async (req, res) => {
  try {
    const { txHash, status } = req.body;
    if (!txHash || !status) return res.status(400).json({ error: 'Thiếu txHash hoặc status' });

    const file = await prisma.file.update({
      where: { id: req.params.id, ownerId: req.user.id },
      data: { onChainTxHash: txHash, onChainStatus: status },
    });

    res.json({ ok: true, file });
  } catch (err) {
    res.status(500).json({ error: 'Cập nhật on-chain thất bại' });
  }
});

// POST /api/files/:id/share - Chia sẻ file
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const { walletAddress, permission = 'read' } = req.body;
    if (!walletAddress) return res.status(400).json({ error: 'Thiếu walletAddress người nhận' });

    const file = await prisma.file.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!file) return res.status(404).json({ error: 'File không tồn tại' });

    const targetUser = await prisma.user.findUnique({ where: { walletAddress } });
    if (!targetUser) return res.status(404).json({ error: 'Người dùng chưa có tài khoản' });

    const share = await prisma.fileShare.upsert({
      where: { fileId_sharedWithId: { fileId: file.id, sharedWithId: targetUser.id } },
      update: { permission },
      create: { fileId: file.id, sharedWithId: targetUser.id, permission },
    });

    res.json({ ok: true, share });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chia sẻ file thất bại' });
  }
});

export default router;
