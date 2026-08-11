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
  const files = ['common.json', 'tools.json'];

  for (const filename of files) {
    const filePath = resolve(zhTWDir, filename);
    console.log(`\n📄 Processing ${filename}...`);

    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    let totalStrings = 0;
    let convertedCount = 0;

    function walk(obj, path = '') {
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
        return obj.map((item, i) => walk(item, `${path}[${i}]`));
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = walk(value, path ? `${path}.${key}` : key);
        }
        return result;
      }
      return obj;
    }

    const convertedData = walk(data);

    if (convertedCount > 0) {
      const out = JSON.stringify(convertedData, null, 2) + '\n';
      writeFileSync(filePath, out, 'utf-8');
      console.log(
        `✅ ${filename}: ${convertedCount}/${totalStrings} strings converted.`
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
