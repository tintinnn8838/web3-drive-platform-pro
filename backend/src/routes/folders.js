import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listFolders, findFolderById, createFolder, deleteFolder } from '../lib/repository.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const folders = await listFolders(req.user.id, req.query.parentId || null);
    res.json({ folders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không tải được folders' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const parentId = req.body.parentId || null;
    if (!name) return res.status(400).json({ error: 'Thiếu tên folder' });

    if (parentId) {
      const parent = await findFolderById(parentId, req.user.id);
      if (!parent) return res.status(404).json({ error: 'Folder cha không tồn tại' });
    }

    const folder = await createFolder({ name, ownerId: req.user.id, parentId });
    res.status(201).json({ ok: true, folder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tạo folder thất bại' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const folder = await findFolderById(req.params.id, req.user.id);
    if (!folder) return res.status(404).json({ error: 'Folder không tồn tại' });
    await deleteFolder(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xóa folder thất bại' });
  }
});

export default router;
