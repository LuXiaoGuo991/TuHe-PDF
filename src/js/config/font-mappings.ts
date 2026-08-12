/**
 * Font mappings for OCR text layer rendering
 * Maps Tesseract language codes to appropriate Noto Sans font families and source URLs.
 */

export const languageToFontFamily: Record<string, string> = {
  // CJK Languages
  jpn: 'Noto Sans JP',
  chi_sim: 'Noto Sans SC',
  chi_tra: 'Noto Sans TC',
  kor: 'Noto Sans KR',

  // Arabic Script
  ara: 'Noto Naskh Arabic',
  fas: 'Noto Naskh Arabic',
  urd: 'Noto Naskh Arabic',
  pus: 'Noto Naskh Arabic',
  kur: 'Noto Naskh Arabic',

  // Devanagari Script
  hin: 'Noto Sans Devanagari',
  mar: 'Noto Sans Devanagari',
  san: 'Noto Sans Devanagari',
  nep: 'Noto Sans Devanagari',

  // Bengali Script
  ben: 'Noto Sans Bengali',
  asm: 'Noto Sans Bengali',

  // Tamil Script
  tam: 'Noto Sans Tamil',

  // Telugu Script
  tel: 'Noto Sans Telugu',

  // Kannada Script
  kan: 'Noto Sans Kannada',

  // Malayalam Script
  mal: 'Noto Sans Malayalam',

  // Gujarati Script
  guj: 'Noto Sans Gujarati',

  // Gurmukhi Script (Punjabi)
  pan: 'Noto Sans Gurmukhi',

  // Oriya Script
  ori: 'Noto Sans Oriya',

  // Sinhala Script
  sin: 'Noto Sans Sinhala',

  // Thai Script
  tha: 'Noto Sans Thai',

  // Lao Script
  lao: 'Noto Sans Lao',

  // Khmer Script
  khm: 'Noto Sans Khmer',

  // Myanmar Script
  mya: 'Noto Sans Myanmar',

  // Tibetan Script
  bod: 'Noto Serif Tibetan',

  // Georgian Script
  kat: 'Noto Sans Georgian',
  kat_old: 'Noto Sans Georgian',

  // Armenian Script
  hye: 'Noto Sans Armenian',

  // Hebrew Script
  heb: 'Noto Sans Hebrew',
  yid: 'Noto Sans Hebrew',

  // Ethiopic Script
  amh: 'Noto Sans Ethiopic',
  tir: 'Noto Sans Ethiopic',

  // Cherokee Script
  chr: 'Noto Sans Cherokee',

  // Syriac Script
  syr: 'Noto Sans Syriac',

  // Cyrillic Script (Noto Sans includes Cyrillic)
  bel: 'Noto Sans',
  bul: 'Noto Sans',
  mkd: 'Noto Sans',
  rus: 'Noto Sans',
  srp: 'Noto Sans',
  srp_latn: 'Noto Sans',
  ukr: 'Noto Sans',
  kaz: 'Noto Sans',
  kir: 'Noto Sans',
  tgk: 'Noto Sans',
  uzb: 'Noto Sans',
  uzb_cyrl: 'Noto Sans',
  aze_cyrl: 'Noto Sans',

  // Latin Script (covered by base Noto Sans)
  afr: 'Noto Sans',
  aze: 'Noto Sans',
  bos: 'Noto Sans',
  cat: 'Noto Sans',
  ceb: 'Noto Sans',
  ces: 'Noto Sans',
  cym: 'Noto Sans',
  dan: 'Noto Sans',
  deu: 'Noto Sans',
  ell: 'Noto Sans',
  eng: 'Noto Sans',
  enm: 'Noto Sans',
  epo: 'Noto Sans',
  est: 'Noto Sans',
  eus: 'Noto Sans',
  fin: 'Noto Sans',
  fra: 'Noto Sans',
  frk: 'Noto Sans',
  frm: 'Noto Sans',
  gle: 'Noto Sans',
  glg: 'Noto Sans',
  grc: 'Noto Sans',
  hat: 'Noto Sans',
  hrv: 'Noto Sans',
  hun: 'Noto Sans',
  iku: 'Noto Sans',
  ind: 'Noto Sans',
  isl: 'Noto Sans',
  ita: 'Noto Sans',
  ita_old: 'Noto Sans',
  jav: 'Noto Sans',
  lat: 'Noto Sans',
  lav: 'Noto Sans',
  lit: 'Noto Sans',
  mlt: 'Noto Sans',
  msa: 'Noto Sans',
  nld: 'Noto Sans',
  nor: 'Noto Sans',
  pol: 'Noto Sans',
  por: 'Noto Sans',
  ron: 'Noto Sans',
  slk: 'Noto Sans',
  slv: 'Noto Sans',
  spa: 'Noto Sans',
  spa_old: 'Noto Sans',
  sqi: 'Noto Sans',
  swa: 'Noto Sans',
  swe: 'Noto Sans',
  tgl: 'Noto Sans',
  tur: 'Noto Sans',
  vie: 'Noto Sans',
  dzo: 'Noto Sans',
  uig: 'Noto Sans',
};

export const fontFamilyToUrl: Record<string, string> = new Proxy(
  {
    'Noto Sans SC': 'NotoSansCJKsc-Regular.otf',
    'Noto Sans': 'NotoSans-Regular.ttf',
  },
  {
    get: (fonts, family) =>
      fonts[family as keyof typeof fonts] || fonts['Noto Sans'],
  }
);

export function getFontUrlForFamily(fontFamily: string): string {
  return fontFamilyToUrl[fontFamily] || fontFamilyToUrl['Noto Sans'];
}

export function getFontAssetFileName(fontFamily: string): string {
  const defaultUrl = getFontUrlForFamily(fontFamily);
  const fileName = defaultUrl.split('/').pop();

  if (!fileName) {
    throw new Error(
      `Could not resolve a font asset filename for ${fontFamily}`
    );
  }

  return fileName;
}
