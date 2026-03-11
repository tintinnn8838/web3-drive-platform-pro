import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localBlobDir = path.resolve(__dirname, '../../data/blobs');

function createS3Client() {
  if (!isR2Configured()) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function ensureLocalDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export async function uploadToStorage(key, buffer, mimeType) {
  const s3 = createS3Client();
  const BUCKET = process.env.R2_BUCKET_NAME;
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return {
    storageKey: key,
    storageUrl: PUBLIC_URL ? `${PUBLIC_URL}/${key}` : null,
  };
}

export async function deleteFromStorage(key) {
  if (isR2Configured()) {
    const s3 = createS3Client();
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    return;
  }

  const filePath = path.join(localBlobDir, key);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const s3 = createS3Client();
  const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function uploadToLocalStorage(key, buffer) {
  const filePath = path.join(localBlobDir, key);
  ensureLocalDir(filePath);
  fs.writeFileSync(filePath, buffer);
  return { storageKey: key, storageUrl: null };
}

export function resolveLocalStoragePath(key) {
  return path.join(localBlobDir, key);
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}
