import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from './env';

export type JwtPayload = {
  sub: string; // user id (mongo _id as string)
  email: string;
};

export function signToken(payload: JwtPayload): string {
  const opts: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtSecret, opts);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
