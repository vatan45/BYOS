import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  REDIS_URL: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// Validate each integration when used, so an unconfigured Drive connection
// does not prevent accounts and the empty workspace from loading.
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, property: string) {
    const schema = envSchema.shape[property as keyof typeof envSchema.shape];
    if (!schema) return undefined;
    return schema.parse(process.env[property]);
  },
});
