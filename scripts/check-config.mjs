import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const required = [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "ENCRYPTION_KEY",
  "JWT_SECRET",
  "NEXT_PUBLIC_APP_URL",
];
const missing = required.filter((name) => !process.env[name]);
for (const name of missing) console.error(`Missing: ${name}`);
if (missing.length) process.exitCode = 1;
else
  console.log(
    "Required environment variables are present. Live connectivity is not verified."
  );
