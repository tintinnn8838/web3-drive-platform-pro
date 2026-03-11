import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/folders - Lấy cây folder của user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { parentId } = req.query;
    const folders = await prisma.folder.findMany({
      where: { ownerId: req.user.id, parentId: parentId || null },
      include: { _count: { select: { files: true, children: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: 'Không tải được folders' });
  }
});

// POST /api/folders - Tạo folder mới
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Thiếu tên folder' });

    if (parentId) {
      const parent = await prisma.folder.findFirst({ where: { id: parentId, ownerId: req.user.id } });
      if (!parent) return res.status(404).json({ error: 'Folder cha không tồn tại' });
    }

    const folder = await prisma.folder.create({
      data: { name: name.trim(), ownerId: req.user.id, parentId: parentId || null },
    });
    res.status(201).json({ ok: true, folder });
  } catch (err) {
    res.status(500).json({ error: 'Tạo folder thất bại' });
  }
});

// DELETE /api/folders/:id - Xóa folder (và tất cả file bên trong)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!folder) return res.status(404).json({ error: 'Folder không tồn tại' });
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Xóa folder thất bại' });
  }
});

export default router;
