import { PrismaClient } from '@prisma/client';

let prismaSingleton = null;

if (process.env.DATABASE_URL) {
  prismaSingleton = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export default prismaSingleton;
