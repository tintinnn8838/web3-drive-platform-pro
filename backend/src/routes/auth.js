import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { buildAuthMessage, generateToken, verifyAptosSignature, verifyToken } from '../lib/auth.js';
import { upsertUserNonce, findUserByWallet, rotateUserNonce, getUserProfile } from '../lib/repository.js';

const router = Router();

router.post('/nonce', async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || '').trim().toLowerCase();
    if (!walletAddress) return res.status(400).json({ error: 'Thiếu walletAddress' });

    const nonce = uuidv4();
    await upsertUserNonce(walletAddress, nonce);

    res.json({
      nonce,
      message: buildAuthMessage(walletAddress, nonce),
      walletAddress,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không tạo được nonce' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || '').trim().toLowerCase();
    const { nonce, signature, publicKey, fullMessage } = req.body;

    if (!walletAddress || !nonce || !signature) {
      return res.status(400).json({ error: 'Thiếu dữ liệu xác thực Petra' });
    }

    const user = await findUserByWallet(walletAddress);
    if (!user) return res.status(404).json({ error: 'User chưa tồn tại, gọi /auth/nonce trước' });
    if (user.nonce !== nonce) return res.status(401).json({ error: 'Nonce không khớp' });

    const expectedMessage = buildAuthMessage(walletAddress, nonce);
    const normalizedMessage = fullMessage || expectedMessage;

    if (normalizedMessage !== expectedMessage) {
      return res.status(401).json({ error: 'Message xác thực không hợp lệ' });
    }

    if (publicKey) {
      const ok = verifyAptosSignature({ signature, publicKey, fullMessage: normalizedMessage });
      if (!ok) return res.status(401).json({ error: 'Chữ ký Petra không hợp lệ' });
    }

    await rotateUserNonce(user.id, uuidv4());

    const token = generateToken(user.id);
    res.json({
      token,
      userId: user.id,
      walletAddress: user.walletAddress,
      verificationMode: publicKey ? 'signature+publicKey' : 'adapter-signature-fallback'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xác thực' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Thiếu token' });

    const payload = verifyToken(authHeader.slice(7));
    const user = await getUserProfile(payload.userId);

    if (!user) return res.status(404).json({ error: 'User không tồn tại' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
});

export default router;
