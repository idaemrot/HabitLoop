import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from '../lib/jwt';
import type { RegisterInput, LoginInput } from '../validators/authValidators';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;   // raw — send to client, never store
}

export interface SafeUser {
  id:        string;
  username:  string;
  email:     string;
  avatarUrl: string | null;
  timezone:  string;
  createdAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSafeUser(user: {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: Date;
}): SafeUser {
  return {
    id:        user.id,
    username:  user.username,
    email:     user.email,
    avatarUrl: user.avatarUrl,
    timezone:  user.timezone,
    createdAt: user.createdAt,
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(
  input: RegisterInput,
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  // 1. Check email uniqueness
  const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
  if (emailExists) throw new AppError('Email is already registered', 409);

  // 2. Check username uniqueness
  const usernameExists = await prisma.user.findUnique({ where: { username: input.username } });
  if (usernameExists) throw new AppError('Username is already taken', 409);

  // 3. Hash password
  const passwordHash = await bcrypt.hash(input.password, 12);

  // 4. Create user + refresh token in a transaction
  const rawRefresh = generateRefreshToken();
  const hashedRefresh = hashRefreshToken(rawRefresh);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username:     input.username,
        email:        input.email,
        passwordHash,
      },
    });

    await tx.refreshToken.create({
      data: {
        userId:    created.id,
        token:     hashedRefresh,
        expiresAt: refreshTokenExpiresAt(30),
      },
    });

    return created;
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  return { user: toSafeUser(user), tokens: { accessToken, refreshToken: rawRefresh } };
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(
  input: LoginInput,
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  // 1. Find user — use a generic error to avoid email enumeration
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  // 2. Verify password
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  // 3. Issue tokens and persist refresh token
  const rawRefresh    = generateRefreshToken();
  const hashedRefresh = hashRefreshToken(rawRefresh);

  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      token:     hashedRefresh,
      expiresAt: refreshTokenExpiresAt(30),
    },
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  return { user: toSafeUser(user), tokens: { accessToken, refreshToken: rawRefresh } };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refreshAccessToken(
  rawRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const hashed = hashRefreshToken(rawRefreshToken);

  // 1. Find matching token record
  const record = await prisma.refreshToken.findUnique({ where: { token: hashed } });

  if (!record) throw new AppError('Invalid refresh token', 401);
  if (record.expiresAt < new Date()) {
    // Clean up expired record
    await prisma.refreshToken.delete({ where: { id: record.id } });
    throw new AppError('Refresh token expired — please log in again', 401);
  }

  // 2. Fetch user
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw new AppError('User not found', 401);

  // 3. Rotate: delete old, create new
  const newRawRefresh    = generateRefreshToken();
  const newHashedRefresh = hashRefreshToken(newRawRefresh);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: record.id } }),
    prisma.refreshToken.create({
      data: {
        userId:    user.id,
        token:     newHashedRefresh,
        expiresAt: refreshTokenExpiresAt(30),
      },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  return { accessToken, refreshToken: newRawRefresh };
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser(rawRefreshToken: string): Promise<void> {
  const hashed = hashRefreshToken(rawRefreshToken);
  // Delete the refresh token (ignore if already gone / invalid)
  await prisma.refreshToken.deleteMany({ where: { token: hashed } });
}

// ─── Get Current User ─────────────────────────────────────────────────────────
export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  return toSafeUser(user);
}

// ─── Cleanup Expired Tokens (called by BullMQ cleanup job) ───────────────────
export async function deleteExpiredRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
