#!/usr/bin/env node

/**
 * Translation resource checker for TuHe PDF.
 *
 * Verifies that every key in common.json and tools.json resolves through the
 * same fallback chain used by i18next. Local coverage is reported separately
 * so incomplete translations remain visible without treating a valid fallback
 * as a broken UI string.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fallbackLanguages } from '../src/js/i18n/fallback-languages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const REFERENCE_LANG = 'en';
const RESOURCES = ['common', 'tools'];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const specificLang = args
  .find((arg) => arg.startsWith('--lang='))
  ?.split('=')[1];

function flattenObject(obj, prefix = '') {
  const flattened = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

function loadTranslation(lang, resource) {
  const filePath = path.join(LOCALES_DIR, lang, `${resource}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(
      `${colors.red}✗ Error parsing ${lang}/${resource}.json:${colors.reset}`,
      error.message
    );
    return null;
  }
}

function getAvailableLanguages() {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(
      `${colors.red}✗ Locales directory not found: ${LOCALES_DIR}${colors.reset}`
    );
    process.exit(1);
  }

  return fs
    .readdirSync(LOCALES_DIR)
    .filter((item) => fs.statSync(path.join(LOCALES_DIR, item)).isDirectory())
    .filter((lang) =>
      RESOURCES.every((resource) =>
        fs.existsSync(path.join(LOCALES_DIR, lang, `${resource}.json`))
      )
    );
}

function getFallbackChain(lang) {
  return [
    lang,
    ...(fallbackLanguages[lang] || fallbackLanguages.default),
  ].filter((item, index, chain) => chain.indexOf(item) === index);
}

function printHeader(text) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSection(title, items, color = colors.yellow) {
  if (items.length === 0) return;

  console.log(`${color}${title} (${items.length}):${colors.reset}`);
  if (verbose) {
    items.forEach((item) => {
      console.log(`  ${colors.dim}•${colors.reset} ${item}`);
    });
  } else {
    console.log(`${colors.dim}   (use --verbose to list keys)${colors.reset}`);
  }
  console.log();
}

function compareResource(lang, resource, referenceFlat) {
  const localTranslation = loadTranslation(lang, resource);
  if (!localTranslation) return null;

  const localFlat = flattenObject(localTranslation);
  const referenceKeys = Object.keys(referenceFlat);
  const localKeys = Object.keys(localFlat);
  const localMissing = referenceKeys.filter(
    (key) => !Object.hasOwn(localFlat, key)
  );
  const extra = localKeys.filter((key) => !Object.hasOwn(referenceFlat, key));
  const fallbackFlat = getFallbackChain(lang)
    .slice(1)
    .map((fallbackLang) => loadTranslation(fallbackLang, resource))
    .filter(Boolean)
    .map((translation) => flattenObject(translation));
  const unresolved = localMissing.filter(
    (key) =>
      !fallbackFlat.some((translation) => Object.hasOwn(translation, key))
  );
  const fallbackResolved = localMissing.filter(
    (key) => !unresolved.includes(key)
  );
  const untranslated = referenceKeys.filter(
    (key) =>
      Object.hasOwn(localFlat, key) &&
      referenceFlat[key] === localFlat[key] &&
      typeof referenceFlat[key] === 'string'
  );

  return {
    fallbackResolved,
    extra,
    localKeyCount: localKeys.length,
    referenceKeyCount: referenceKeys.length,
    unresolved,
    untranslated,
  };
}

function main() {
  console.log(`${colors.blue}🌍 TuHe PDF Translation Checker${colors.reset}\n`);

  const languages = getAvailableLanguages();
  if (!languages.includes(REFERENCE_LANG)) {
    console.error(
      `${colors.red}✗ Reference language (${REFERENCE_LANG}) not found${colors.reset}`
    );
    process.exit(1);
  }

  const langsToCheck = specificLang
    ? languages.filter((lang) => lang === specificLang)
    : languages.filter((lang) => lang !== REFERENCE_LANG);
  if (langsToCheck.length === 0) {
    console.error(
      `${colors.red}✗ No matching languages to check${colors.reset}`
    );
    process.exit(1);
  }

  const referenceResources = Object.fromEntries(
    RESOURCES.map((resource) => [
      resource,
      flattenObject(loadTranslation(REFERENCE_LANG, resource)),
    ])
  );
  let hasIssues = false;

  console.log(
    `${colors.dim}Available languages: ${languages.join(', ')}${colors.reset}`
  );
  console.log(
    `${colors.dim}Fallback policy: zh-TW -> zh -> en; all others -> en${colors.reset}`
  );

  for (const lang of langsToCheck) {
    printHeader(`Checking: ${lang.toUpperCase()}`);

    for (const resource of RESOURCES) {
      const result = compareResource(
        lang,
        resource,
        referenceResources[resource]
      );
      if (!result) {
        hasIssues = true;
        continue;
      }

      console.log(
        `${resource}: ${result.localKeyCount}/${result.referenceKeyCount} local keys, ${result.fallbackResolved.length} resolved by fallback`
      );

      if (result.unresolved.length > 0) {
        hasIssues = true;
        printSection('Unresolved Keys', result.unresolved, colors.red);
      }

      printSection('Unexpected local keys', result.extra, colors.yellow);

      if (result.untranslated.length > 0) {
        console.log(
          `${colors.cyan}Possibly untranslated: ${result.untranslated.length}${colors.reset}`
        );
      }
    }
  }

  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  if (hasIssues) {
    console.log(
      `${colors.red}Translation resources have unresolved keys.${colors.reset}\n`
    );
    process.exit(1);
  }

  console.log(
    `${colors.green}All translation keys resolve through their configured fallback chain.${colors.reset}\n`
  );
}

main();
