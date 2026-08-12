/**
 * Convert zh-TW locale JSON files from Simplified Chinese to Traditional Chinese (Taiwan).
 * Uses OpenCC cn→twp (Taiwan standard with phrases).
 * Only replaces strings whose conversion differs from the original,
 * preserving already-correct traditional strings.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { Converter } = await import('opencc-js');

  // cn → twp: Simplified to Traditional Chinese (Taiwan standard with phrases)
  const converter = Converter({ from: 'cn', to: 'twp' });

  const zhTWDir = resolve(__dirname, '..', 'public', 'locales', 'zh-TW');
  const zhDir = resolve(__dirname, '..', 'public', 'locales', 'zh');
  const enDir = resolve(__dirname, '..', 'public', 'locales', 'en');
  const files = ['common.json', 'tools.json'];

  for (const filename of files) {
    const filePath = resolve(zhTWDir, filename);
    console.log(`\n📄 Processing ${filename}...`);

    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const zhData = JSON.parse(readFileSync(resolve(zhDir, filename), 'utf-8'));
    const enData = JSON.parse(readFileSync(resolve(enDir, filename), 'utf-8'));

    let totalStrings = 0;
    let convertedCount = 0;
    let addedCount = 0;

    function walk(obj, path = '', reference = undefined) {
      if (typeof obj === 'string') {
        totalStrings++;
        const converted = converter(obj);
        if (converted !== obj) {
          console.log(`  ✏️  [${path}]: "${obj}" → "${converted}"`);
          convertedCount++;
          return converted;
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((item, i) =>
          walk(item, `${path}[${i}]`, reference?.[i])
        );
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        const keys = new Set([
          ...Object.keys(reference || {}),
          ...Object.keys(obj),
        ]);
        for (const key of keys) {
          if (!(key in obj)) addedCount++;
          const sourceValue = key in obj ? obj[key] : reference[key];
          result[key] = walk(
            sourceValue,
            path ? `${path}.${key}` : key,
            reference?.[key]
          );
        }
        return result;
      }
      return obj;
    }

    const convertedData = walk(data, '', zhData);

    const missingEnglishKeys = [];
    function verifyKeys(reference, target, keyPath = '') {
      for (const [key, value] of Object.entries(reference)) {
        const currentPath = keyPath ? `${keyPath}.${key}` : key;
        if (!(key in target)) {
          missingEnglishKeys.push(currentPath);
        } else if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          verifyKeys(value, target[key], currentPath);
        }
      }
    }
    verifyKeys(enData, convertedData);
    if (missingEnglishKeys.length > 0) {
      throw new Error(
        `${filename} still misses English keys: ${missingEnglishKeys.join(', ')}`
      );
    }

    if (convertedCount > 0 || addedCount > 0) {
      const out = JSON.stringify(convertedData, null, 2) + '\n';
      writeFileSync(filePath, out, 'utf-8');
      console.log(
        `✅ ${filename}: ${convertedCount}/${totalStrings} strings converted, ${addedCount} keys added.`
      );
    } else {
      console.log(
        `✅ ${filename}: No changes needed (all ${totalStrings} strings already traditional).`
      );
    }
  }

  console.log('\n🎉 zh-TW conversion complete.\n');
}

main().catch((err) => {
  console.error('❌ Conversion failed:', err);
  process.exit(1);
});
