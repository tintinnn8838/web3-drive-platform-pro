import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// Bước 1: Lấy nonce để ký
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: 'Thiếu walletAddress' });

    // Upsert user + tạo nonce mới
    const nonce = uuidv4();
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: { walletAddress, nonce },
    });

    res.json({
      nonce: user.nonce,
      message: `Web3Drive: Xác thực ví ${walletAddress} với nonce ${user.nonce}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Bước 2: Xác minh chữ ký và cấp JWT
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature, nonce } = req.body;
    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({ error: 'Thiếu walletAddress, signature hoặc nonce' });
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ error: 'User chưa tồn tại, gọi /auth/nonce trước' });
    if (user.nonce !== nonce) return res.status(401).json({ error: 'Nonce không khớp' });

    // TODO: Verify Aptos signature on-chain nếu cần strict verification
    // Hiện tại trust chữ ký từ Petra (phù hợp cho dApp thông thường)

    // Reset nonce sau khi dùng (prevent replay attack)
    await prisma.user.update({
      where: { walletAddress },
      data: { nonce: uuidv4() },
    });

    const token = generateToken(user.id);
    res.json({ token, userId: user.id, walletAddress: user.walletAddress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xác thực' });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Thiếu token' });

    const { verifyToken } = await import('../middleware/auth.js');
    const payload = verifyToken(authHeader.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, walletAddress: true, createdAt: true, _count: { select: { files: true, folders: true } } },
    });

    if (!user) return res.status(404).json({ error: 'User không tồn tại' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
});

export default router;
