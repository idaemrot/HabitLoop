import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AccessTokenPayload {
  sub: string;    // user id
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  jti?: string;   // unique token id — used for revocation blocklist
}

// ─── Access Token (15 min, returned in response body) ────────────────────────
export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { ...payload, jti },
    env.JWT_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

// ─── Refresh Token (raw random bytes — caller hashes before DB storage) ───────
export function generateRefreshToken(): string {
  // 64 random bytes → 128-char hex string (raw, never stored)
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(rawToken: string): string {
  // SHA-256 → 64-char hex — the ONLY form stored in the DB
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function refreshTokenExpiresAt(days = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
