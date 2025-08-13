import { SignJWT, jwtVerify } from 'jose';

export interface PluginTokenPayload {
  appId: string;
  domain: string;
  userId?: string;
  iat: number;
  exp: number;
}

export async function generatePluginToken(
  payload: { appId: string; domain: string; userId?: string },
  secret: string,
  expiresIn: string = '24h'
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expTime = now + (24 * 60 * 60); // 24小时后过期
  
  const jwt = await new SignJWT({
    ...payload,
    iat: now,
    exp: expTime
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expTime)
    .sign(new TextEncoder().encode(secret));

  return jwt;
}

export async function verifyPluginToken(
  token: string,
  secret: string
): Promise<PluginTokenPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as unknown as PluginTokenPayload;
  } catch (error) {
    throw new Error('Invalid token: ' + (error as Error).message);
  }
}

export function extractTokenFromHeader(authorization: string | null): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.substring(7);
}
