const DEFAULT_SITE_URL = 'https://tuhepdf.cn';

export const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(
  /\/+$/,
  ''
);
