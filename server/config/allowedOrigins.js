const DEFAULT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const parseEnvOrigins = () =>
  [process.env.CLIENT_URL, process.env.CLIENT_URLS]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const getAllowedOrigins = () => {
  const allowed = new Set(DEFAULT_ORIGINS);
  parseEnvOrigins().forEach((origin) => allowed.add(origin));
  return allowed;
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.has(origin)) return true;

  return process.env.ALLOW_VERCEL_PREVIEWS === 'true' && vercelPreviewPattern.test(origin);
};

const corsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

module.exports = {
  corsOrigin,
  getAllowedOrigins,
  isAllowedOrigin,
};
