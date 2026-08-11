#!/usr/bin/env node
/**
 * Add data-i18n attributes to FAQ questions across all tool pages.
 * The FAQ answers already have data-i18n — this script wraps the
 * hardcoded question text in <span data-i18n="..."> elements.
 *
 * Run: node scripts/i18n-fix-faq-questions.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.resolve(__dirname, '../src/pages');
const LOCALES_DIR = path.resolve(__dirname, '../public/locales');

// Shared translations for faq2q and faq3q (identical across all tools)
const FAQ2Q_EN = 'Are my files private and secure?';
const FAQ3Q_EN = 'Is there a file size limit?';
const FAQ2Q_ZH = '我的文件安全私密吗？';
const FAQ3Q_ZH = '有文件大小限制吗？';

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Build mapping from answer key prefix to tool key
// e.g., "pdfEditor" is used by add-blank-page, edit-pdf, etc.
function buildToolKeyMap() {
  const htmlFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.html'));
  const map = {}; // filename -> { faqKeyPrefix }

  for (const file of htmlFiles) {
    const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf-8');
    // Extract the answer key prefix: tools:pdfEditor from data-i18n="tools:pdfEditor.faq1a"
    const match = content.match(/data-i18n="tools:([^"]+)\.faq1a"/);
    if (match) {
      map[file] = match[1]; // e.g., "pdfEditor"
    }
  }
  return map;
}

function fixFaqQuestions() {
  const toolKeyMap = buildToolKeyMap();
  const htmlFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.html'));

  // Add shared keys to en and zh common.json
  for (const lang of ['en', 'zh']) {
    const commonPath = path.join(LOCALES_DIR, lang, 'common.json');
    const common = loadJson(commonPath);
    if (!common.faq) common.faq = {};
    common.faq.privateSecure = lang === 'zh' ? FAQ2Q_ZH : FAQ2Q_EN;
    common.faq.sizeLimit = lang === 'zh' ? FAQ3Q_ZH : FAQ3Q_EN;
    saveJson(commonPath, common);
    console.log(`  Updated ${lang}/common.json with shared FAQ keys`);
  }

  let fixedCount = 0;
  let needsFaq1qKeys = new Map(); // toolKey -> { filename, questionText }

  for (const file of htmlFiles) {
    const filePath = path.join(PAGES_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    const faqKeyPrefix = toolKeyMap[file];

    if (!faqKeyPrefix) {
      // No faq1a key found — this tool might not have FAQ section
      continue;
    }

    // Helper: wrap question text with data-i18n span
    // The structure is: >\n            Question text\n            <i data-lucide=...></i>\n          </summary>
    function wrapQuestion(html, pattern, i18nKey) {
      // Match: > whitespace QUESTION_TEXT whitespace+anything whitespace* </summary>
      const re = new RegExp(
        `>(\\s*)(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\s\\S]*?)<\\/summary`,
        'i'
      );
      if (re.test(html)) {
        return html.replace(re, (match, ws1, text, rest) => {
          return `>${ws1}<span data-i18n="tools:${i18nKey}">${text}</span>${rest}</summary`;
        });
      }
      return null;
    }

    // Fix faq2q: "Are my files private and secure?"
    const faq2Result = wrapQuestion(
      content,
      'Are my files private and secure\\?',
      `${faqKeyPrefix}.faq2q`
    );
    if (faq2Result !== null) {
      content = faq2Result;
      modified = true;
    }

    // Fix faq3q: "Is there a file size limit?"
    const faq3Result = wrapQuestion(
      content,
      'Is there a file size limit\\?',
      `${faqKeyPrefix}.faq3q`
    );
    if (faq3Result !== null) {
      content = faq3Result;
      modified = true;
    }

    // Fix faq1q: "Is [tool name] really free?"
    const faq1TextMatch = content.match(
      />(\s*)(Is .+? really free\?)([\s\S]*?)<\/summary/i
    );
    if (faq1TextMatch) {
      const questionText = faq1TextMatch[2].trim();
      const i18nKey = `${faqKeyPrefix}.faq1q`;
      content = content.replace(
        />(\s*)(Is .+? really free\?)([\s\S]*?)<\/summary/i,
        (match, ws1, text, rest) => {
          return `>${ws1}<span data-i18n="tools:${i18nKey}">${text}</span>${rest}</summary`;
        }
      );
      modified = true;
      if (!needsFaq1qKeys.has(faqKeyPrefix)) {
        needsFaq1qKeys.set(faqKeyPrefix, { filename: file, questionText });
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      fixedCount++;
    }
  }

  // Add faq1q keys to locale files where missing
  for (const lang of ['en', 'zh']) {
    const toolsPath = path.join(LOCALES_DIR, lang, 'tools.json');
    const tools = loadJson(toolsPath);
    let localeModified = false;

    for (const [toolKey, info] of needsFaq1qKeys) {
      if (!tools[toolKey]) continue;

      if (!tools[toolKey].faq1q || tools[toolKey].faq1q === '') {
        tools[toolKey].faq1q = info.questionText;
        localeModified = true;
        console.log(
          `  Added ${lang}/tools.json ${toolKey}.faq1q = "${info.questionText}"`
        );
      }
      if (!tools[toolKey].faq2q || tools[toolKey].faq2q === '') {
        tools[toolKey].faq2q = FAQ2Q_EN;
        localeModified = true;
      }
      if (!tools[toolKey].faq3q || tools[toolKey].faq3q === '') {
        tools[toolKey].faq3q = FAQ3Q_EN;
        localeModified = true;
      }
    }

    if (localeModified) {
      saveJson(toolsPath, tools);
    }
  }

  // Also add Chinese translations for the faq1q keys
  const zhToolsPath = path.join(LOCALES_DIR, 'zh', 'tools.json');
  const zhTools = loadJson(zhToolsPath);
  let zhModified = false;

  // Map of English tool-name-in-question to Chinese translations
  const zhFaq1qMap = {};
  // Try to infer Chinese translations from existing tool names
  for (const [toolKey] of needsFaq1qKeys) {
    if (zhTools[toolKey] && zhTools[toolKey].name) {
      const zhName = zhTools[toolKey].name;
      if (zhTools[toolKey].faq1q && zhTools[toolKey].faq1q !== '') continue; // already translated
      zhTools[toolKey].faq1q = `${zhName}真的免费吗？`;
      zhModified = true;
      console.log(
        `  Added zh/tools.json ${toolKey}.faq1q = "${zhName}真的免费吗？"`
      );
    }
  }

  // Fix faq2q and faq3q in zh tools as well
  for (const key of Object.keys(zhTools)) {
    if (typeof zhTools[key] === 'object' && zhTools[key] !== null) {
      if (zhTools[key].faq2q && zhTools[key].faq2q === FAQ2Q_EN) {
        zhTools[key].faq2q = FAQ2Q_ZH;
        zhModified = true;
      }
      if (zhTools[key].faq3q && zhTools[key].faq3q === FAQ3Q_EN) {
        zhTools[key].faq3q = FAQ3Q_ZH;
        zhModified = true;
      }
    }
  }

  if (zhModified) {
    saveJson(zhToolsPath, zhTools);
    console.log('  Updated zh/tools.json with Chinese FAQ questions');
  }

  console.log(
    `\n✅ Fixed ${fixedCount} HTML files with FAQ question i18n wrappers`
  );
  console.log(
    `   ${needsFaq1qKeys.size} tool keys had faq1q keys added to locale files`
  );
}

fixFaqQuestions();
