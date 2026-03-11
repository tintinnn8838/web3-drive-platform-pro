import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const metadataPath = path.resolve(__dirname, '../../data/metadata.json');

function useDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function readLocal() {
  if (!fs.existsSync(metadataPath)) {
    return { users: [], folders: [], files: [], fileShares: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return {
    users: parsed.users || [],
    folders: parsed.folders || [],
    files: parsed.files || [],
    fileShares: parsed.fileShares || [],
  };
}

function writeLocal(data) {
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
}

function withFolderCounts(state, folder) {
  const childFolders = state.folders.filter((item) => item.parentId === folder.id && item.ownerId === folder.ownerId);
  const files = state.files.filter((item) => item.folderId === folder.id && item.ownerId === folder.ownerId);
  return { ...folder, _count: { children: childFolders.length, files: files.length } };
}

function matchesFolderFilter(itemFolderId, filterFolderId) {
  return (itemFolderId || null) === (filterFolderId || null);
}

function safeWalletAddress(walletAddress) {
  return String(walletAddress || '').trim().toLowerCase();
}

export async function repositoryHealth() {
  return { mode: useDatabase() ? 'postgresql-prisma' : 'local-json-fallback' };
}

export async function upsertUserNonce(walletAddress, nonce) {
  const normalized = safeWalletAddress(walletAddress);

  if (useDatabase()) {
    return prisma.user.upsert({
      where: { walletAddress: normalized },
      update: { nonce },
      create: { walletAddress: normalized, nonce },
    });
  }

  const state = readLocal();
  const now = new Date().toISOString();
  const existing = state.users.find((item) => item.walletAddress === normalized);

  if (existing) {
    existing.nonce = nonce;
    existing.updatedAt = now;
    writeLocal(state);
    return existing;
  }

  const user = { id: uuidv4(), walletAddress: normalized, nonce, createdAt: now, updatedAt: now };
  state.users.push(user);
  writeLocal(state);
  return user;
}

export async function findUserByWallet(walletAddress) {
  const normalized = safeWalletAddress(walletAddress);
  if (useDatabase()) return prisma.user.findUnique({ where: { walletAddress: normalized } });
  return readLocal().users.find((item) => item.walletAddress === normalized) || null;
}

export async function rotateUserNonce(userId, nonce) {
  if (useDatabase()) return prisma.user.update({ where: { id: userId }, data: { nonce } });
  const state = readLocal();
  const user = state.users.find((item) => item.id === userId);
  if (!user) return null;
  user.nonce = nonce;
  user.updatedAt = new Date().toISOString();
  writeLocal(state);
  return user;
}

export async function findUserById(userId) {
  if (useDatabase()) return prisma.user.findUnique({ where: { id: userId } });
  return readLocal().users.find((item) => item.id === userId) || null;
}

export async function getUserProfile(userId) {
  if (useDatabase()) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletAddress: true, createdAt: true, _count: { select: { files: true, folders: true } } },
    });
  }

  const state = readLocal();
  const user = state.users.find((item) => item.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
    _count: {
      files: state.files.filter((item) => item.ownerId === userId).length,
      folders: state.folders.filter((item) => item.ownerId === userId).length,
    },
  };
}

export async function listFolders(ownerId, parentId = null) {
  if (useDatabase()) {
    return prisma.folder.findMany({
      where: { ownerId, parentId: parentId || null },
      include: { _count: { select: { files: true, children: true } } },
      orderBy: { name: 'asc' },
    });
  }

  const state = readLocal();
  return state.folders
    .filter((item) => item.ownerId === ownerId && matchesFolderFilter(item.parentId, parentId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => withFolderCounts(state, item));
}

export async function findFolderById(folderId, ownerId) {
  if (useDatabase()) return prisma.folder.findFirst({ where: { id: folderId, ownerId } });
  return readLocal().folders.find((item) => item.id === folderId && item.ownerId === ownerId) || null;
}

export async function createFolder({ name, ownerId, parentId = null }) {
  if (useDatabase()) {
    return prisma.folder.create({ data: { name, ownerId, parentId: parentId || null } });
  }

  const state = readLocal();
  const now = new Date().toISOString();
  const folder = { id: uuidv4(), name, ownerId, parentId: parentId || null, createdAt: now, updatedAt: now };
  state.folders.push(folder);
  writeLocal(state);
  return folder;
}

function collectFolderDescendants(state, folderId) {
  const direct = state.folders.filter((item) => item.parentId === folderId).map((item) => item.id);
  return direct.reduce((acc, id) => [...acc, id, ...collectFolderDescendants(state, id)], []);
}

export async function deleteFolder(folderId, ownerId) {
  if (useDatabase()) return prisma.folder.delete({ where: { id: folderId } });
  const state = readLocal();
  const folder = state.folders.find((item) => item.id === folderId && item.ownerId === ownerId);
  if (!folder) return null;
  const descendants = collectFolderDescendants(state, folderId);
  const ids = new Set([folderId, ...descendants]);
  const deletedFileIds = new Set(state.files.filter((item) => ids.has(item.folderId)).map((item) => item.id));
  state.folders = state.folders.filter((item) => !ids.has(item.id));
  state.files = state.files.filter((item) => !ids.has(item.folderId));
  state.fileShares = state.fileShares.filter((item) => !deletedFileIds.has(item.fileId));
  writeLocal(state);
  return folder;
}

export async function listFiles(ownerId, folderId = null) {
  if (useDatabase()) {
    return prisma.file.findMany({
      where: { ownerId, folderId: folderId || null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fileName: true, mimeType: true, size: true, blobId: true, onChainStatus: true,
        onChainTxHash: true, isPublic: true, createdAt: true, folderId: true, storageUrl: true,
      },
    });
  }

  return readLocal().files
    .filter((item) => item.ownerId === ownerId && matchesFolderFilter(item.folderId, folderId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createFile(data) {
  if (useDatabase()) return prisma.file.create({ data });
  const state = readLocal();
  const now = new Date().toISOString();
  const file = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isPublic: false,
    onChainTxHash: null,
    onChainStatus: 'pending',
    ...data,
  };
  state.files.push(file);
  writeLocal(state);
  return file;
}

export async function findOwnedFile(fileId, ownerId) {
  if (useDatabase()) return prisma.file.findFirst({ where: { id: fileId, ownerId } });
  return readLocal().files.find((item) => item.id === fileId && item.ownerId === ownerId) || null;
}

export async function findReadableFile(fileId, userId) {
  if (useDatabase()) {
    return prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [{ ownerId: userId }, { shares: { some: { sharedWithId: userId } } }, { isPublic: true }],
      },
    });
  }

  const state = readLocal();
  const file = state.files.find((item) => item.id === fileId);
  if (!file) return null;
  const shared = state.fileShares.some((item) => item.fileId === fileId && item.sharedWithId === userId);
  if (file.ownerId === userId || file.isPublic || shared) return file;
  return null;
}

export async function deleteFileRecord(fileId) {
  if (useDatabase()) return prisma.file.delete({ where: { id: fileId } });
  const state = readLocal();
  state.files = state.files.filter((item) => item.id !== fileId);
  state.fileShares = state.fileShares.filter((item) => item.fileId !== fileId);
  writeLocal(state);
}

export async function updateFileOnChain(fileId, ownerId, { txHash, status }) {
  if (useDatabase()) {
    const file = await prisma.file.findFirst({ where: { id: fileId, ownerId } });
    if (!file) return null;
    return prisma.file.update({ where: { id: fileId }, data: { onChainTxHash: txHash, onChainStatus: status } });
  }

  const state = readLocal();
  const file = state.files.find((item) => item.id === fileId && item.ownerId === ownerId);
  if (!file) return null;
  file.onChainTxHash = txHash;
  file.onChainStatus = status;
  file.updatedAt = new Date().toISOString();
  writeLocal(state);
  return file;
}

export async function upsertFileShare(fileId, sharedWithId, permission = 'read') {
  if (useDatabase()) {
    return prisma.fileShare.upsert({
      where: { fileId_sharedWithId: { fileId, sharedWithId } },
      update: { permission },
      create: { fileId, sharedWithId, permission },
    });
  }

  const state = readLocal();
  const existing = state.fileShares.find((item) => item.fileId === fileId && item.sharedWithId === sharedWithId);
  if (existing) {
    existing.permission = permission;
    writeLocal(state);
    return existing;
  }

  const share = { id: uuidv4(), fileId, sharedWithId, permission, createdAt: new Date().toISOString() };
  state.fileShares.push(share);
  writeLocal(state);
  return share;
}
