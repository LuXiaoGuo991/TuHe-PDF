/**
 * Merge static page i18n keys from JSON data files into en/zh common.json.
 * Data files are JSON (not JS), avoiding Chinese quote escaping issues.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      deepMerge(target[key], value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
  return target;
}

function countLeafKeys(obj) {
  let n = 0;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) n += countLeafKeys(v);
    else n++;
  }
  return n;
}

// Load EN new keys
const enNew = JSON.parse(
  readFileSync(resolve(__dirname, 'i18n-static-en-new.json'), 'utf-8')
);

// Build ZH new keys from the HTML pages' data-i18n content
const zhNew = JSON.parse(JSON.stringify(enNew)); // deep clone structure (values will be overwritten)

// Map of data-i18n key → Chinese text extracted from HTML
// These are the data-i18n values we added to each page
const zhMap = {
  // 404.html
  'notFound.heading': '页面未找到',
  'notFound.description':
    '哎呀！您要找的页面似乎走丢了。不过别担心，我们的 PDF 工具还在这里等您。',
  'notFound.backHome': '返回首页',
  'notFound.browseTools': '浏览全部工具',
  'notFound.tryPopular': '或者试试这些热门工具：',

  // about.html
  'aboutPage.heading': '关于我们',
  'aboutPage.subtitle': 'TuHe PDF · 图合',
  'aboutPage.whoWeAre': '我们是谁',
  'aboutPage.whoWeAreContent':
    'TuHe PDF（图合）是一个专注于办公场景的 PDF 工作台。我们把日常最常用的 PDF 操作——合并、拆分、压缩、格式转换、页面整理、签名与水印——集中在一个统一的界面里，让你打开浏览器就能完成全部工作。',
  'aboutPage.clientSide': '纯浏览器端处理',
  'aboutPage.clientSideContent':
    '我们的核心原则是：<strong>你的文件属于你</strong>。 所有 PDF 处理都在你自己的浏览器中完成（基于 JavaScript 与 WebAssembly），文件从头到尾不会上传到任何服务器。这意味着：',
  'aboutPage.clientSideItem1': '文件内容、文件名和元数据都不会离开你的电脑；',
  'aboutPage.clientSideItem2': '没有上传等待，处理速度只取决于你的设备性能；',
  'aboutPage.clientSideItem3': '没有文件大小和次数限制，无需注册登录。',
  'aboutPage.workbenchDesign': '工作台式设计',
  'aboutPage.workbenchDesignContent':
    '与「一个工具一个页面」的传统站点不同，TuHe PDF 采用工作台式布局：左侧是工具卡片栏，右侧是多标签工作区。你可以同时打开多个工具、在标签之间自由切换，像在桌面软件里一样处理文档。',
  'aboutPage.openSource': '开源基础',
  'aboutPage.openSourceLicenseLink': '许可',

  // contact.html
  'contactPage.heading': '联系我们',
  'contactPage.subtitle': '我们很乐意听到你的反馈',
  'contactPage.feedback': '问题反馈与功能建议',
  'contactPage.feedbackContent':
    '如果你在使用 TuHe PDF 时遇到问题，或者希望我们增加某个工具或功能，欢迎通过邮件告诉我们。请尽量附上：使用的浏览器与版本、操作步骤、以及（如方便）控制台报错截图。',
  'contactPage.email': '邮箱：',
  'contactPage.fileNotice': '关于文件问题的说明',
  'contactPage.fileNoticeContent':
    'TuHe PDF 的所有处理都在你的浏览器本地完成，<strong>请不要通过邮件发送你的 PDF 文件</strong>。如果某个文件处理失败，描述文件的大致情况（页数、大小、是否加密、来源软件）通常就足够我们定位问题。',
  'contactPage.cooperation': '合作与其他事宜',
  'contactPage.cooperationContent':
    '商务合作、媒体报道或其他事宜，同样请发送至',
  'contactPage.willReply': '我们会尽快回复。',

  // licensing.html
  'licensingPage.heading': '许可',
  'licensingPage.subtitle': '开源许可与第三方声明',
  'licensingPage.license': '1. 许可证',
  'licensingPage.licenseContent':
    'TuHe PDF 的源代码依据 <strong>GNU Affero General Public License v3.0（AGPL-3.0）</strong> 发布。你可以自由使用、研究、修改和再分发本软件，前提是遵循该许可证的条款；完整许可证文本见源代码仓库根目录的 <code>LICENSE</code> 文件，或访问 <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">gnu.org/licenses/agpl-3.0.html</a>。',
  'licensingPage.upstream': '2. 上游项目',
  'licensingPage.upstreamContent':
    'TuHe PDF 基于 <a href="https://github.com/alam00000/bentopdf" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">BentoPDF</a> 二次开发。感谢上游作者与贡献者的工作；BentoPDF 同样以 AGPL-3.0 许可发布。',
  'licensingPage.thirdParty': '3. 第三方组件',
  'licensingPage.thirdPartyContent':
    '本软件使用了若干优秀的开源库，包括但不限于 PDF-lib、PDF.js、PDF-lib.js 生态工具及 WebAssembly 组件。这些组件各自的许可证（MIT、Apache-2.0 等）归其作者所有，详见源代码仓库的依赖清单。',
  'licensingPage.yourFiles': '4. 你的文件',
  'licensingPage.yourFilesContent':
    '软件许可不影响你文件的版权。使用 TuHe PDF 处理的文档，其全部权利始终归你所有；处理过程在你的浏览器本地完成，我们不会对文件主张任何权利，也无法接触其内容。',
  'licensingPage.disclaimer': '5. 免责声明',
  'licensingPage.disclaimerContent':
    '本软件按「现状」提供，不附带任何明示或默示的保证，包括但不限于适销性和特定用途适用性的保证。使用本软件产生的风险由你自行承担，详见 AGPL-3.0 许可证条款。',

  // privacy.html
  'privacy.heading': '隐私政策',
  'privacy.lastUpdated': '最后更新：2025 年 9 月 14 日',
  'privacy.section1': '1. 我们对隐私的承诺',
  'privacy.section1Content':
    'TuHe PDF（以下简称“我们”）从根本上是一款以隐私为核心的服务。本隐私政策阐述了我们对保护您隐私的坚定承诺。我们的核心原则很简单：<strong>您的文件属于您自己</strong>。我们不会也无法查看、访问、存储或共享您的文档。所有 PDF 处理完全在您自己的计算机上、在您的网页浏览器中（客户端）完成。',
  'privacy.section1_1': '1.1 客户端处理原则',
  'privacy.section1_1Content':
    '与其他在线 PDF 服务不同，TuHe PDF 不会将您的文件上传到服务器进行处理。您使用的工具由直接在您设备上运行的 JavaScript 和 WebAssembly 库驱动。这意味着您的数据永远不会离开您的计算机，为您提供最高级别的隐私和安全性。',
  'privacy.section2': '2. 我们不收集的信息',
  'privacy.section2Intro':
    '由于我们的客户端架构，我们在技术上无法收集以下信息：',
  'privacy.section2Item1': '您使用的 PDF 文件或任何其他文档的内容。',
  'privacy.section2Item2': '您文档中包含的任何个人数据。',
  'privacy.section2Item3': '您的文档文件名。',
  'privacy.section2Item4':
    '来自您文件的任何衍生信息或元数据，超出工具在当前会话中运行所必需的部分（且这些信息在会话结束后立即被丢弃）。',
  'privacy.section3': '3. 我们可能收集的信息（非个人数据）',
  'privacy.section3Content':
    '为了改进我们的网站和服务，我们可能收集匿名的、无法识别个人身份的信息。这类数据帮助我们了解用户如何与我们的网站互动、哪些工具最受欢迎以及如何改进用户体验。这包括：',
  'privacy.section3Item1':
    '<strong>使用分析：</strong>匿名数据，如使用了哪些工具、使用频率以及访问了哪些功能。这些数据是聚合的，无法追溯到个人用户或文档。',
  'privacy.section3Item2':
    '<strong>性能数据：</strong>匿名的错误报告或性能指标，帮助我们识别和修复错误。这些数据不包含任何个人信息或文件内容。',
  'privacy.section3Analytics':
    '我们使用尊重隐私的分析平台来实现此目的。具体来说，我们使用 <a href="https://simpleanalytics.com" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">Simple Analytics</a> 来跟踪匿名访问计数。这意味着我们可以知道有多少用户访问我们的网站，但 <strong>我们从不收集个人信息或识别个人用户</strong>。Simple Analytics 完全符合 GDPR 并尊重用户隐私。我们不使用跟踪 Cookie 进行广告或跨站分析。',
  'privacy.section4': '4. 第三方库',
  'privacy.section4Content':
    'TuHe PDF 使用强大的开源库构建，如 PDF-lib.js 和 PDF.js。这些库受到全球开发者的信赖，并遵循相同的客户端处理原则。虽然我们已经审查了这些库，但为了您自己的安心，我们建议您查看它们各自的隐私政策。',
  'privacy.section5': '5. 安全性',
  'privacy.section5Content':
    '由于您的文件从未通过互联网传输到我们的服务器，您在传输过程中或服务器存储期间不会受到潜在数据泄露的影响。您文档的安全掌握在您自己手中，并受到您自己计算机和网页浏览器安全性的保护。',
  'privacy.section6': '6. 儿童隐私',
  'privacy.section6Content':
    '我们的服务不面向 13 岁以下的个人。我们不会故意收集儿童的任何个人信息。如果您认为有儿童向我们提供了个人信息，请联系我们，我们将采取措施删除此类信息。',
  'privacy.section7': '7. 本隐私政策的变更',
  'privacy.section7Content':
    '我们可能会不时更新本隐私政策。我们将通过在此页面上发布新政策并更新顶部的“最后更新”日期来通知您任何变更。建议您定期查看本隐私政策以了解任何变更。',
  'privacy.section8': '8. 联系我们',
  'privacy.section8Content':
    '如果您对本隐私政策有任何疑问，请通过 <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a> 与我们联系。',

  // terms.html
  'terms.heading': '服务条款',
  'terms.lastUpdated': '最后更新：2025 年 9 月 14 日',
  'terms.section1': '1. 接受条款',
  'terms.section1Content':
    '访问和使用 TuHe PDF（以下简称“服务”），即表示您接受并同意受本协议条款的约束。如果您不同意遵守这些条款，请不要使用本服务。',
  'terms.section2': '2. 服务说明',
  'terms.section2Content':
    'TuHe PDF 提供一套用于处理和操作 PDF（便携式文档格式）文件的客户端工具。本服务执行的所有操作均在您的网页浏览器内本地完成。<strong>没有任何文件或数据会上传或存储到我们的服务器。</strong>',
  'terms.section3': '3. 用户行为与责任',
  'terms.section3Content':
    '您对使用本服务处理的文件内容负全部责任。您同意不将本服务用于任何非法目的，包括但不限于：',
  'terms.section3Item1': '处理侵犯他人版权、商标或知识产权的任何材料。',
  'terms.section3Item2': '处理任何诽谤、中伤、淫秽或其他违法材料。',
  'terms.section3Item3': '试图逆向工程、反编译或以其他方式破坏本服务的功能。',
  'terms.section4': '4. 免责声明',
  'terms.section4Content':
    '本服务按“现状”和“可用”原则提供，不作任何明示或默示的保证。我们不保证服务无错误、不中断，也不保证使用工具获得的结果准确、完整或可靠。您确认自行承担使用本服务的风险。',
  'terms.section4Content2':
    '特别是，我们不保证文件转换、压缩或修改的完美性。数据丢失或损坏虽然可能性极低，但仍有可能发生。您有责任保留原始文件的备份。',
  'terms.section5': '5. 责任限制',
  'terms.section5Content':
    '在适用法律允许的最大范围内，TuHe PDF、其开发者或关联方在任何情况下均不对任何间接、附带、特殊、后果性或惩罚性损害承担责任，包括但不限于利润损失、数据损失、使用损失、商誉损失或其他无形损失，无论这些损失是否因以下原因引起：',
  'terms.section5Item1': '您访问或使用（或无法访问或使用）本服务。',
  'terms.section5Item2': '任何第三方在本服务上的行为或内容。',
  'terms.section5Item3': '从本服务获取的任何内容。',
  'terms.section5Item4': '对您的传输或内容的未经授权访问、使用或更改。',
  'terms.section5Liability':
    '我们对您因使用本免费服务而产生的任何及所有索赔的总责任金额不超过零美元（¥0.00）。',
  'terms.section6': '6. 知识产权',
  'terms.section6Content':
    'TuHe PDF 提供的视觉界面、图形、设计、汇编、信息、计算机代码、产品、软件、服务以及所有其他元素均受知识产权及其他法律保护。本服务包含的所有材料均为 TuHe PDF 或其第三方许可方的财产。',
  'terms.section7': '7. 适用法律',
  'terms.section7Content':
    '本条款受中华人民共和国法律管辖并依其解释，不考虑法律冲突条款。',
  'terms.section8': '8. 条款变更',
  'terms.section8Content':
    '我们保留随时自行决定修改或替换这些条款的权利。我们将通过更新本页顶部的“最后更新”日期来通知变更。在修订生效后继续访问或使用我们的服务，即表示您同意受修订后条款的约束。',
  'terms.section9': '9. 联系我们',
  'terms.section9Content':
    '如果您对这些条款有任何疑问，请通过 <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a> 与我们联系。',
  'terms.section10': '10. 商业许可条款',
  'terms.section10Content':
    '购买 TuHe PDF 的商业许可，即表示您确认并同意以下内容：',
  'terms.section10Item1':
    '<strong>许可协议：</strong> 您已在购买前完整阅读并理解 <a href="licensing.html" class="text-indigo-400 hover:underline">许可页面</a> 的全部内容。',
  'terms.section10Item2':
    '<strong>许可性质：</strong> 您购买的是 TuHe PDF 开源代码的商业许可，该许可授予您在闭源和专有环境中使用软件的权利，无需承担 AGPL-3.0 许可证的义务。',
  'terms.section10Item3':
    '<strong>无许可证密钥：</strong> TuHe PDF 不使用许可证密钥。购买后，您将收到一个包含完整源代码和二进制文件的 ZIP 归档包，与公开可用的开源仓库内容一致。',
  'terms.section10Item4':
    '<strong>不退款政策：</strong> <strong class="text-red-400">购买后任何情况下均不退款。</strong> 所有销售均为最终决定。完成购买即表示您确认已评估该软件（可在 GitHub 上免费获取）并对其功能感到满意。',
  'terms.section10Item5':
    '<strong>第三方组件：</strong> 商业许可不授予以闭源方式使用 AGPL 许可的第三方组件（如 CPDF、PyMuPDF 和 Ghostscript）的权利。您必须遵守这些组件的 AGPL v3 条款，或从其各自的供应商处获取单独的商业许可。',
  'terms.section10Item6':
    '<strong>无限使用：</strong> 该许可允许在您组织内的设备、服务器和用户机器上无限制地使用，没有按用户、按机器或按席位的限制。',
  'terms.section10Footer':
    '有关完整的许可详情，请访问我们的 <a href="licensing.html" class="text-indigo-400 hover:underline">许可页面</a>。',
};

// Apply zhMap to zhNew
function setByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

const zhNewFlat = {};
for (const [key, value] of Object.entries(zhMap)) {
  setByPath(zhNew, key, value);
  zhNewFlat[key] = value;
}

// Process en/common.json
const enPath = resolve(
  __dirname,
  '..',
  'public',
  'locales',
  'en',
  'common.json'
);
const enData = JSON.parse(readFileSync(enPath, 'utf-8'));
deepMerge(enData, enNew);

// Add workbench keys
enData.workbench.toggleRail = 'Show / Hide sidebar';
enData.workbench.openToolRail = 'Open tool sidebar';
enData.workbench.quickTools = 'Common Tools';
enData.workbench.homeSubtitle =
  'Browser-based PDF Workbench · Merge, Split, Compress, Convert · Your files never leave your device';
enData.workbench.homeHint =
  'Select any tool from the sidebar to start — it will open in a tab on the right';
enData.workbench.searchPlaceholder = 'Search tools… (Ctrl+K)';

writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n', 'utf-8');
const enCount = countLeafKeys(enNew) + 5;
console.log(`✅ Updated en/common.json (+${enCount} new keys)`);

// Process zh/common.json
const zhPath = resolve(
  __dirname,
  '..',
  'public',
  'locales',
  'zh',
  'common.json'
);
const zhData = JSON.parse(readFileSync(zhPath, 'utf-8'));
deepMerge(zhData, zhNew);

// Add workbench keys
zhData.workbench.toggleRail = '展开 / 收起卡片栏';
zhData.workbench.openToolRail = '打开工具卡片栏';
zhData.workbench.quickTools = '常用工具';
zhData.workbench.homeSubtitle =
  '纯浏览器端的 PDF 工作台 · 合并、拆分、压缩、转换 · 文件全程不出本机';
zhData.workbench.homeHint =
  '从左侧卡片栏选择任意工具开始，工具会在右侧标签页中打开';
zhData.workbench.searchPlaceholder = '搜索工具… (Ctrl+K)';

writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n', 'utf-8');
const zhCount = countLeafKeys(zhNew) + 5;
console.log(`✅ Updated zh/common.json (+${zhCount} new keys)`);

// Sync to dist
const distEn = resolve(__dirname, '..', 'dist', 'locales', 'en', 'common.json');
const distZh = resolve(__dirname, '..', 'dist', 'locales', 'zh', 'common.json');
writeFileSync(distEn, JSON.stringify(enData, null, 2) + '\n', 'utf-8');
writeFileSync(distZh, JSON.stringify(zhData, null, 2) + '\n', 'utf-8');
console.log('✅ Synced en/zh common.json to dist/');

console.log('\n🎉 Static page i18n keys merge complete!');
