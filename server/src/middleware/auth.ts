import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ── JWT Secret (Production-grade) ──────────────────────────────────────────────
// Auto-generates a unique 64-byte hex secret on first install, stored securely
// in the app's userData directory. Never hardcoded, never lost across updates.
function getOrCreateJwtSecret(): string {
    // In Electron, DB_PATH is set to a user-writable directory
    const baseDir = process.env.DB_PATH
        ? path.dirname(process.env.DB_PATH)
        : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
    const secretFile = path.join(baseDir, '.jwt_secret');
    try {
        if (fs.existsSync(secretFile)) {
            const secret = fs.readFileSync(secretFile, 'utf-8').trim();
            if (secret && secret.length >= 32) return secret;
        }
        // Generate a new cryptographically secure secret
        const newSecret = crypto.randomBytes(64).toString('hex');
        fs.mkdirSync(baseDir, { recursive: true });
        fs.writeFileSync(secretFile, newSecret, { encoding: 'utf-8', mode: 0o600 });
        return newSecret;
    } catch (e) {
        // Fallback: derive from env or use a strong fallback
        return process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    }
}

const JWT_SECRET = getOrCreateJwtSecret();

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        full_name: string;
        role: string;
        branch_id: number | null;
    };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = db.prepare(`
      SELECT id, email, full_name, role, branch_id FROM users WHERE id = ? AND is_active = 1
    `).get(decoded.userId) as AuthRequest['user'];

        if (!user) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export function roleMiddleware(...allowedRoles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
}

export function generateToken(userId: number): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
