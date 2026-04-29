const DEFAULT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.63.203.206:3000',
  'http://10.63.203.23:3000',
]);

const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');

const parseEnvOrigins = () =>
  [process.env.CLIENT_URL, process.env.CLIENT_URLS]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
const privateNetworkOriginPattern = /^https?:\/\/(?:(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/i;
const anyHttpOriginPattern = /^https?:\/\/[^/]+$/i;

const getAllowedOrigins = () => {
  const allowed = new Set(DEFAULT_ORIGINS);
  parseEnvOrigins().forEach((origin) => allowed.add(origin));
  return allowed;
};

const isPrivateNetworkOrigin = (origin) =>
  process.env.NODE_ENV !== 'production' && privateNetworkOriginPattern.test(origin);

const isDevelopmentOrigin = (origin) =>
  process.env.NODE_ENV !== 'production' && anyHttpOriginPattern.test(origin);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.has(normalizedOrigin)) return true;
  if (isPrivateNetworkOrigin(normalizedOrigin)) return true;
  if (isDevelopmentOrigin(normalizedOrigin)) return true;

  return process.env.ALLOW_VERCEL_PREVIEWS === 'true' && vercelPreviewPattern.test(normalizedOrigin);
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
