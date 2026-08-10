import crypto from 'crypto';

export function generateTwoFactorSecret(): { secret: string; otpauthUrl: string } {
  const secret = crypto.randomBytes(20).toString('base32').replace(/=/g, '');
  const otpauthUrl = `otpauth://totp/CloudDroid:${secret}?secret=${secret}&issuer=CloudDroid&digits=6&period=30`;
  return { secret, otpauthUrl };
}

export function verifyTwoFactorCode(secret: string, code: string): boolean {
  const cleanCode = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const key = Buffer.from(secret.replace(/\s/g, ''), 'base32');
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;

  for (let i = -1; i <= 1; i++) {
    const counter = Math.floor((now + i * timeStep) / timeStep);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(counter, 4);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const codeValue = ((digest[offset] & 0x7f) << 24) |
                      ((digest[offset + 1] & 0xff) << 16) |
                      ((digest[offset + 2] & 0xff) << 8) |
                      (digest[offset + 3] & 0xff);

    const totp = (codeValue % 1000000).toString().padStart(6, '0');
    if (totp === cleanCode) {
      return true;
    }
  }

  return false;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}
