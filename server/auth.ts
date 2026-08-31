import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { StoredUser, UserRole } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'Missing JWT_SECRET. Copy .env.example to .env and set JWT_SECRET to a long random string before starting the server.'
  );
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export function signToken(user: StoredUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '12h' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as AuthTokenPayload;
}

export interface AuthedRequest extends Request {
  auth?: AuthTokenPayload;
}

// Protects an Express route: requires a valid "Authorization: Bearer <token>" header.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ error: 'לא מחובר' });
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'החיבור פג תוקף, יש להתחבר שוב' });
  }
}

// Like requireAuth, but never blocks the request — used by routes the public catalog page
// also calls with no token at all (see catalogRoutes.ts's makeCrud GET handler). If a valid
// token IS present, req.auth is set so the route can org-scope the response for a logged-in
// org_manager/coordinator; with no token (or an invalid one), req.auth stays undefined and
// the route falls back to its public, unfiltered behavior.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (token) {
    try {
      req.auth = verifyToken(token);
    } catch {
      // ignore — treat as anonymous rather than failing the request
    }
  }
  next();
}

// Org-scoping check shared by every entity route: super_admin sees/edits everything;
// org_manager and coordinator are confined to their own organization.
export function canAccessOrg(auth: AuthTokenPayload, organizationId: string | undefined): boolean {
  if (auth.role === 'super_admin') return true;
  return auth.organizationId === organizationId;
}
