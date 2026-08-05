import crypto from "crypto";
import { env } from "../env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;


function getEncryptionKey(): Buffer {
  // Ensure the key is exactly 32 bytes
  return crypto.createHash("sha256").update(env.ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // format: iv:authTag:encryptedText
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
