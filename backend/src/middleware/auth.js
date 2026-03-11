import { verifyToken } from '../lib/auth.js';
import { findUserById } from '../lib/repository.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Thiếu token xác thực' });
    }

    const payload = verifyToken(authHeader.slice(7));
    const user = await findUserById(payload.userId);

    if (!user) return res.status(401).json({ error: 'User không tồn tại' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}
