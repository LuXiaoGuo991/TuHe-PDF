const DEFAULT_SITE_URL = 'https://www.tuhepdf.cn';

export const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(
  /\/+$/,
  ''
);
