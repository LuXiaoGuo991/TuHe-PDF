/**
 * Add missing i18n keys for static pages to en/common.json and zh/common.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- EN keys ----
const enNewKeys = {
  notFound: {
    heading: 'Page Not Found',
    description:
      "Oops! The page you're looking for seems to have gone missing. But don't worry, our PDF tools are still here for you.",
    backHome: 'Back to Home',
    browseTools: 'Browse All Tools',
    tryPopular: 'Or try these popular tools:',
  },
  aboutPage: {
    heading: 'About Us',
    subtitle: 'TuHe PDF · 图合',
    whoWeAre: 'Who We Are',
    whoWeAreContent:
      'TuHe PDF (图合) is a PDF workbench focused on office scenarios. We bring together the most commonly used PDF operations — merging, splitting, compressing, format conversion, page organization, signing and watermarking — in a unified interface, so you can get everything done right in your browser.',
    clientSide: '100% Client-Side Processing',
    clientSideContent:
      'Our core principle is: <strong>your files belong to you</strong>. All PDF processing happens right in your own browser (powered by JavaScript and WebAssembly). Your files are never uploaded to any server. This means:',
    clientSideItem1:
      'File content, names, and metadata never leave your computer;',
    clientSideItem2:
      'No upload waits — processing speed depends only on your device;',
    clientSideItem3:
      'No file size or usage limits — no registration or login required.',
    workbenchDesign: 'Workbench-Style Design',
    workbenchDesignContent:
      'Unlike traditional sites with "one tool per page", TuHe PDF uses a workbench layout: a tool card sidebar on the left and a multi-tab workspace on the right. You can open multiple tools simultaneously and switch between tabs freely, just like working in desktop software.',
    openSource: 'Open Source Foundation',
    openSourceLicenseLink: 'Licensing',
  },
  contactPage: {
    heading: 'Contact Us',
    subtitle: "We'd love to hear your feedback",
    feedback: 'Feedback & Feature Requests',
    feedbackContent:
      'If you encounter any issues using TuHe PDF, or would like us to add a tool or feature, please let us know via email. Please include: your browser and version, steps to reproduce, and (if convenient) a screenshot of any console errors.',
    email: 'Email:',
    fileNotice: 'A Note About File Issues',
    fileNoticeContent:
      "All TuHe PDF processing happens locally in your browser. <strong>Please do not send your PDF files via email</strong>. If a file fails to process, describing the file's general characteristics (page count, size, whether it's encrypted, source software) is usually enough for us to identify the issue.",
    cooperation: 'Partnership & Other Inquiries',
    cooperationContent:
      'For business partnerships, media inquiries, or other matters, please also send to',
    willReply: 'we will respond as soon as possible.',
  },
  licensingPage: {
    heading: 'Licensing',
    subtitle: 'Open Source License & Third-Party Notices',
    license: '1. License',
    licenseContent:
      'The source code of TuHe PDF is released under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. You are free to use, study, modify, and redistribute this software, provided you comply with the terms of the license. The full license text can be found in the <code>LICENSE</code> file in the source repository, or visit <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">gnu.org/licenses/agpl-3.0.html</a>.',
    upstream: '2. Upstream Project',
    upstreamContent:
      'TuHe PDF is based on <a href="https://github.com/alam00000/bentopdf" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">BentoPDF</a>. We thank the upstream authors and contributors for their work; BentoPDF is also released under the AGPL-3.0 license.',
    thirdParty: '3. Third-Party Components',
    thirdPartyContent:
      "This software uses several excellent open-source libraries, including but not limited to PDF-lib, PDF.js, PDF-lib.js ecosystem tools, and WebAssembly components. The respective licenses of these components (MIT, Apache-2.0, etc.) belong to their authors, as detailed in the source repository's dependency manifest.",
    yourFiles: '4. Your Files',
    yourFilesContent:
      'The software license does not affect the copyright of your files. Documents processed with TuHe PDF remain entirely your property. Processing happens locally in your browser; we claim no rights over your files and cannot access their content.',
    disclaimer: '5. Disclaimer',
    disclaimerContent:
      'This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability and fitness for a particular purpose. Use of this software is at your own risk, as detailed in the AGPL-3.0 license terms.',
  },
  privacy: {
    heading: 'Privacy Policy',
    lastUpdated: 'Last updated: September 14, 2025',
    section1: '1. Our Commitment to Privacy',
    section1Content:
      'TuHe PDF ("we") is fundamentally a privacy-first service. This Privacy Policy explains our unwavering commitment to protecting your privacy. Our core principle is simple: <strong>your files belong to you</strong>. We do not and cannot view, access, store, or share your documents. All PDF processing takes place entirely on your own computer, within your web browser (client-side).',
    section1_1: '1.1 Client-Side Processing Principle',
    section1_1Content:
      'Unlike other online PDF services, TuHe PDF does not upload your files to a server for processing. The tools you use are powered by JavaScript and WebAssembly libraries that run directly on your device. This means your data never leaves your computer, providing you with the highest level of privacy and security.',
    section2: '2. Information We Do Not Collect',
    section2Intro:
      'Due to our client-side architecture, we are technically unable to collect:',
    section2Item1: 'The content of your PDF files or any other documents.',
    section2Item2: 'Any personal data contained within your documents.',
    section2Item3: 'Your document file names.',
    section2Item4:
      'Any derived information or metadata from your files beyond what is necessary for the tools to run in the current session (and this information is discarded immediately when the session ends).',
    section3: '3. Information We May Collect (Non-Personal Data)',
    section3Content:
      'To improve our website and services, we may collect anonymous, non-personally identifiable information. This data helps us understand how users interact with our website, which tools are most popular, and how to improve the user experience. This includes:',
    section3Item1:
      '<strong>Usage Analytics:</strong> Anonymous data such as which tools are used, how often, and which features are accessed. This data is aggregated and cannot be traced back to individual users or documents.',
    section3Item2:
      '<strong>Performance Data:</strong> Anonymous error reports or performance metrics that help us identify and fix bugs. This data contains no personal information or file content.',
    section3Analytics:
      'We use a privacy-respecting analytics platform for this purpose. Specifically, we use <a href="https://simpleanalytics.com" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">Simple Analytics</a> to track anonymous visit counts. This means we can know how many users visit our website, but <strong>we never collect personal information or identify individual users</strong>. Simple Analytics is fully GDPR compliant and respects user privacy. We do not use tracking cookies for advertising or cross-site analytics.',
    section4: '4. Third-Party Libraries',
    section4Content:
      'TuHe PDF is built using powerful open-source libraries such as PDF-lib.js and PDF.js. These libraries are trusted by developers worldwide and adhere to the same client-side processing principles. While we have reviewed these libraries, we recommend reviewing their respective privacy policies for your own peace of mind.',
    section5: '5. Security',
    section5Content:
      'Because your files are never transmitted over the internet to our servers, you are not exposed to potential data breaches during transmission or server storage. The security of your documents is in your own hands and protected by the security of your own computer and web browser.',
    section6: "6. Children's Privacy",
    section6Content:
      'Our service is not directed to individuals under the age of 13. We do not knowingly collect any personal information from children. If you believe a child has provided us with personal information, please contact us and we will take steps to delete such information.',
    section7: '7. Changes to This Privacy Policy',
    section7Content:
      'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.',
    section8: '8. Contact Us',
    section8Content:
      'If you have any questions about this Privacy Policy, please contact us at <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a>.',
  },
  terms: {
    heading: 'Terms of Service',
    lastUpdated: 'Last updated: September 14, 2025',
    section1: '1. Acceptance of Terms',
    section1Content:
      'By accessing and using TuHe PDF ("the Service"), you accept and agree to be bound by the terms of this agreement. If you do not agree to abide by these terms, please do not use the Service.',
    section2: '2. Service Description',
    section2Content:
      'TuHe PDF provides a suite of client-side tools for processing and manipulating PDF (Portable Document Format) files. All operations performed by the Service are done locally within your web browser. <strong>No files or data are uploaded or stored on our servers.</strong>',
    section3: '3. User Conduct and Responsibilities',
    section3Content:
      'You are solely responsible for the content of the files you process with the Service. You agree not to use the Service for any unlawful purpose, including but not limited to:',
    section3Item1:
      'Processing any material that infringes on copyright, trademark, or intellectual property of others.',
    section3Item2:
      'Processing any defamatory, libelous, obscene, or otherwise illegal material.',
    section3Item3:
      'Attempting to reverse engineer, decompile, or otherwise disrupt the functionality of the Service.',
    section4: '4. Disclaimer of Warranties',
    section4Content:
      'The Service is provided on an "as is" and "as available" basis, without any warranties of any kind, express or implied. We do not warrant that the Service will be error-free or uninterrupted, or that the results obtained from using the tools will be accurate, complete, or reliable. You acknowledge that you use the Service at your own risk.',
    section4Content2:
      'In particular, we do not guarantee the perfection of file conversions, compression, or modifications. Data loss or corruption, while extremely unlikely, is possible. You are responsible for maintaining backups of your original files.',
    section5: '5. Limitation of Liability',
    section5Content:
      'To the fullest extent permitted by applicable law, TuHe PDF, its developers, or affiliates shall in no event be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, whether or not resulting from:',
    section5Item1:
      'Your access to or use of (or inability to access or use) the Service.',
    section5Item2: 'Any conduct or content of any third party on the Service.',
    section5Item3: 'Any content obtained from the Service.',
    section5Item4:
      'Unauthorized access, use, or alteration of your transmissions or content.',
    section5Liability:
      'Our total liability to you for any and all claims arising from your use of this free Service shall not exceed zero dollars ($0.00).',
    section6: '6. Intellectual Property',
    section6Content:
      'The visual interfaces, graphics, design, compilation, information, computer code, products, software, services, and all other elements of the Service provided by TuHe PDF are protected by intellectual property and other laws. All materials included in the Service are the property of TuHe PDF or its third-party licensors.',
    section7: '7. Governing Law',
    section7Content:
      "These Terms shall be governed by and construed in accordance with the laws of the People's Republic of China, without regard to conflict of law provisions.",
    section8: '8. Changes to Terms',
    section8Content:
      'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will notify you of changes by updating the "Last updated" date at the top of this page. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.',
    section9: '9. Contact Us',
    section9Content:
      'If you have any questions about these Terms, please contact us at <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a>.',
    section10: '10. Commercial License Terms',
    section10Content:
      'By purchasing a commercial license for TuHe PDF, you acknowledge and agree to the following:',
    section10Item1:
      '<strong>License Agreement:</strong> You have read and fully understand the <a href="licensing.html" class="text-indigo-400 hover:underline">Licensing page</a> in its entirety before purchasing.',
    section10Item2:
      '<strong>Nature of License:</strong> You are purchasing a commercial license for the TuHe PDF open source code, granting you the right to use the software in closed-source and proprietary environments without the obligations of the AGPL-3.0 license.',
    section10Item3:
      '<strong>No License Keys:</strong> TuHe PDF does not use license keys. Upon purchase, you will receive a ZIP archive containing the complete source code and binaries, identical to what is publicly available in the open source repository.',
    section10Item4:
      '<strong>No Refund Policy:</strong> <strong class="text-red-400">No refunds will be issued under any circumstances after purchase.</strong> All sales are final. By completing your purchase, you confirm that you have evaluated the software (freely available on GitHub) and are satisfied with its capabilities.',
    section10Item5:
      '<strong>Third-Party Components:</strong> The commercial license does not grant the right to use AGPL-licensed third-party components (such as CPDF, PyMuPDF, and Ghostscript) in a closed-source manner. You must either comply with the AGPL v3 terms for these components or obtain separate commercial licenses from their respective vendors.',
    section10Item6:
      '<strong>Unlimited Use:</strong> The license permits unlimited use on devices, servers, and user machines within your organization, with no per-user, per-machine, or per-seat restrictions.',
    section10Footer:
      'For complete license details, please visit our <a href="licensing.html" class="text-indigo-400 hover:underline">Licensing page</a>.',
  },
};

// ---- ZH keys (original Chinese from HTML pages) ----
const zhNewKeys = {
  notFound: {
    heading: '页面未找到',
    description:
      '哎呀！您要找的页面似乎走丢了。不过别担心，我们的 PDF 工具还在这里等您。',
    backHome: '返回首页',
    browseTools: '浏览全部工具',
    tryPopular: '或者试试这些热门工具：',
  },
  aboutPage: {
    heading: '关于我们',
    subtitle: 'TuHe PDF · 图合',
    whoWeAre: '我们是谁',
    whoWeAreContent:
      'TuHe PDF（图合）是一个专注于办公场景的 PDF 工作台。我们把日常最常用的 PDF 操作——合并、拆分、压缩、格式转换、页面整理、签名与水印——集中在一个统一的界面里，让你打开浏览器就能完成全部工作。',
    clientSide: '纯浏览器端处理',
    clientSideContent:
      '我们的核心原则是：<strong>你的文件属于你</strong>。 所有 PDF 处理都在你自己的浏览器中完成（基于 JavaScript 与 WebAssembly），文件从头到尾不会上传到任何服务器。这意味着：',
    clientSideItem1: '文件内容、文件名和元数据都不会离开你的电脑；',
    clientSideItem2: '没有上传等待，处理速度只取决于你的设备性能；',
    clientSideItem3: '没有文件大小和次数限制，无需注册登录。',
    workbenchDesign: '工作台式设计',
    workbenchDesignContent:
      '与「一个工具一个页面」的传统站点不同，TuHe PDF 采用工作台式布局：左侧是工具卡片栏，右侧是多标签工作区。你可以同时打开多个工具、在标签之间自由切换，像在桌面软件里一样处理文档。',
    openSource: '开源基础',
    openSourceLicenseLink: '许可',
  },
  contactPage: {
    heading: '联系我们',
    subtitle: '我们很乐意听到你的反馈',
    feedback: '问题反馈与功能建议',
    feedbackContent:
      '如果你在使用 TuHe PDF 时遇到问题，或者希望我们增加某个工具或功能，欢迎通过邮件告诉我们。请尽量附上：使用的浏览器与版本、操作步骤、以及（如方便）控制台报错截图。',
    email: '邮箱：',
    fileNotice: '关于文件问题的说明',
    fileNoticeContent:
      'TuHe PDF 的所有处理都在你的浏览器本地完成，<strong>请不要通过邮件发送你的 PDF 文件</strong>。如果某个文件处理失败，描述文件的大致情况（页数、大小、是否加密、来源软件）通常就足够我们定位问题。',
    cooperation: '合作与其他事宜',
    cooperationContent: '商务合作、媒体报道或其他事宜，同样请发送至',
    willReply: '我们会尽快回复。',
  },
  licensingPage: {
    heading: '许可',
    subtitle: '开源许可与第三方声明',
    license: '1. 许可证',
    licenseContent:
      'TuHe PDF 的源代码依据 <strong>GNU Affero General Public License v3.0（AGPL-3.0）</strong> 发布。你可以自由使用、研究、修改和再分发本软件，前提是遵循该许可证的条款；完整许可证文本见源代码仓库根目录的 <code>LICENSE</code> 文件，或访问 <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">gnu.org/licenses/agpl-3.0.html</a>。',
    upstream: '2. 上游项目',
    upstreamContent:
      'TuHe PDF 基于 <a href="https://github.com/alam00000/bentopdf" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">BentoPDF</a> 二次开发。感谢上游作者与贡献者的工作；BentoPDF 同样以 AGPL-3.0 许可发布。',
    thirdParty: '3. 第三方组件',
    thirdPartyContent:
      '本软件使用了若干优秀的开源库，包括但不限于 PDF-lib、PDF.js、PDF-lib.js 生态工具及 WebAssembly 组件。这些组件各自的许可证（MIT、Apache-2.0 等）归其作者所有，详见源代码仓库的依赖清单。',
    yourFiles: '4. 你的文件',
    yourFilesContent:
      '软件许可不影响你文件的版权。使用 TuHe PDF 处理的文档，其全部权利始终归你所有；处理过程在你的浏览器本地完成，我们不会对文件主张任何权利，也无法接触其内容。',
    disclaimer: '5. 免责声明',
    disclaimerContent:
      '本软件按「现状」提供，不附带任何明示或默示的保证，包括但不限于适销性和特定用途适用性的保证。使用本软件产生的风险由你自行承担，详见 AGPL-3.0 许可证条款。',
  },
  privacy: {
    heading: '隐私政策',
    lastUpdated: '最后更新：2025 年 9 月 14 日',
    section1: '1. 我们对隐私的承诺',
    section1Content:
      "TuHe PDF（以下简称'我们'）从根本上是一款以隐私为核心的服务。本隐私政策阐述了我们对保护您隐私的坚定承诺。我们的核心原则很简单：<strong>您的文件属于您自己</strong>。我们不会也无法查看、访问、存储或共享您的文档。所有 PDF 处理完全在您自己的计算机上、在您的网页浏览器中（客户端）完成。",
    section1_1: '1.1 客户端处理原则',
    section1_1Content:
      '与其他在线 PDF 服务不同，TuHe PDF 不会将您的文件上传到服务器进行处理。您使用的工具由直接在您设备上运行的 JavaScript 和 WebAssembly 库驱动。这意味着您的数据永远不会离开您的计算机，为您提供最高级别的隐私和安全性。',
    section2: '2. 我们不收集的信息',
    section2Intro: '由于我们的客户端架构，我们在技术上无法收集以下信息：',
    section2Item1: '您使用的 PDF 文件或任何其他文档的内容。',
    section2Item2: '您文档中包含的任何个人数据。',
    section2Item3: '您的文档文件名。',
    section2Item4:
      '来自您文件的任何衍生信息或元数据，超出工具在当前会话中运行所必需的部分（且这些信息在会话结束后立即被丢弃）。',
    section3: '3. 我们可能收集的信息（非个人数据）',
    section3Content:
      '为了改进我们的网站和服务，我们可能收集匿名的、无法识别个人身份的信息。这类数据帮助我们了解用户如何与我们的网站互动、哪些工具最受欢迎以及如何改进用户体验。这包括：',
    section3Item1:
      '<strong>使用分析：</strong>匿名数据，如使用了哪些工具、使用频率以及访问了哪些功能。这些数据是聚合的，无法追溯到个人用户或文档。',
    section3Item2:
      '<strong>性能数据：</strong>匿名的错误报告或性能指标，帮助我们识别和修复错误。这些数据不包含任何个人信息或文件内容。',
    section3Analytics:
      '我们使用尊重隐私的分析平台来实现此目的。具体来说，我们使用 <a href="https://simpleanalytics.com" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">Simple Analytics</a> 来跟踪匿名访问计数。这意味着我们可以知道有多少用户访问我们的网站，但 <strong>我们从不收集个人信息或识别个人用户</strong>。Simple Analytics 完全符合 GDPR 并尊重用户隐私。我们不使用跟踪 Cookie 进行广告或跨站分析。',
    section4: '4. 第三方库',
    section4Content:
      'TuHe PDF 使用强大的开源库构建，如 PDF-lib.js 和 PDF.js。这些库受到全球开发者的信赖，并遵循相同的客户端处理原则。虽然我们已经审查了这些库，但为了您自己的安心，我们建议您查看它们各自的隐私政策。',
    section5: '5. 安全性',
    section5Content:
      '由于您的文件从未通过互联网传输到我们的服务器，您在传输过程中或服务器存储期间不会受到潜在数据泄露的影响。您文档的安全掌握在您自己手中，并受到您自己计算机和网页浏览器安全性的保护。',
    section6: '6. 儿童隐私',
    section6Content:
      '我们的服务不面向 13 岁以下的个人。我们不会故意收集儿童的任何个人信息。如果您认为有儿童向我们提供了个人信息，请联系我们，我们将采取措施删除此类信息。',
    section7: '7. 本隐私政策的变更',
    section7Content:
      "我们可能会不时更新本隐私政策。我们将通过在此页面上发布新政策并更新顶部的'最后更新'日期来通知您任何变更。建议您定期查看本隐私政策以了解任何变更。",
    section8: '8. 联系我们',
    section8Content:
      '如果您对本隐私政策有任何疑问，请通过 <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a> 与我们联系。',
  },
  terms: {
    heading: '服务条款',
    lastUpdated: '最后更新：2025 年 9 月 14 日',
    section1: '1. 接受条款',
    section1Content:
      "访问和使用 TuHe PDF（以下简称'服务'），即表示您接受并同意受本协议条款的约束。如果您不同意遵守这些条款，请不要使用本服务。",
    section2: '2. 服务说明',
    section2Content:
      'TuHe PDF 提供一套用于处理和操作 PDF（便携式文档格式）文件的客户端工具。本服务执行的所有操作均在您的网页浏览器内本地完成。<strong>没有任何文件或数据会上传或存储到我们的服务器。</strong>',
    section3: '3. 用户行为与责任',
    section3Content:
      '您对使用本服务处理的文件内容负全部责任。您同意不将本服务用于任何非法目的，包括但不限于：',
    section3Item1: '处理侵犯他人版权、商标或知识产权的任何材料。',
    section3Item2: '处理任何诽谤、中伤、淫秽或其他违法材料。',
    section3Item3: '试图逆向工程、反编译或以其他方式破坏本服务的功能。',
    section4: '4. 免责声明',
    section4Content:
      "本服务按'现状'和'可用'原则提供，不作任何明示或默示的保证。我们不保证服务无错误、不中断，也不保证使用工具获得的结果准确、完整或可靠。您确认自行承担使用本服务的风险。",
    section4Content2:
      '特别是，我们不保证文件转换、压缩或修改的完美性。数据丢失或损坏虽然可能性极低，但仍有可能发生。您有责任保留原始文件的备份。',
    section5: '5. 责任限制',
    section5Content:
      '在适用法律允许的最大范围内，TuHe PDF、其开发者或关联方在任何情况下均不对任何间接、附带、特殊、后果性或惩罚性损害承担责任，包括但不限于利润损失、数据损失、使用损失、商誉损失或其他无形损失，无论这些损失是否因以下原因引起：',
    section5Item1: '您访问或使用（或无法访问或使用）本服务。',
    section5Item2: '任何第三方在本服务上的行为或内容。',
    section5Item3: '从本服务获取的任何内容。',
    section5Item4: '对您的传输或内容的未经授权访问、使用或更改。',
    section5Liability:
      '我们对您因使用本免费服务而产生的任何及所有索赔的总责任金额不超过零美元（¥0.00）。',
    section6: '6. 知识产权',
    section6Content:
      'TuHe PDF 提供的视觉界面、图形、设计、汇编、信息、计算机代码、产品、软件、服务以及所有其他元素均受知识产权及其他法律保护。本服务包含的所有材料均为 TuHe PDF 或其第三方许可方的财产。',
    section7: '7. 适用法律',
    section7Content:
      '本条款受中华人民共和国法律管辖并依其解释，不考虑法律冲突条款。',
    section8: '8. 条款变更',
    section8Content:
      "我们保留随时自行决定修改或替换这些条款的权利。我们将通过更新本页顶部的'最后更新'日期来通知变更。在修订生效后继续访问或使用我们的服务，即表示您同意受修订后条款的约束。",
    section9: '9. 联系我们',
    section9Content:
      '如果您对这些条款有任何疑问，请通过 <a href="mailto:contact@tuhepdf.cn">contact@tuhepdf.cn</a> 与我们联系。',
    section10: '10. 商业许可条款',
    section10Content: '购买 TuHe PDF 的商业许可，即表示您确认并同意以下内容：',
    section10Item1:
      '<strong>许可协议：</strong> 您已在购买前完整阅读并理解 <a href="licensing.html" class="text-indigo-400 hover:underline">许可页面</a> 的全部内容。',
    section10Item2:
      '<strong>许可性质：</strong> 您购买的是 TuHe PDF 开源代码的商业许可，该许可授予您在闭源和专有环境中使用软件的权利，无需承担 AGPL-3.0 许可证的义务。',
    section10Item3:
      '<strong>无许可证密钥：</strong> TuHe PDF 不使用许可证密钥。购买后，您将收到一个包含完整源代码和二进制文件的 ZIP 归档包，与公开可用的开源仓库内容一致。',
    section10Item4:
      '<strong>不退款政策：</strong> <strong class="text-red-400">购买后任何情况下均不退款。</strong> 所有销售均为最终决定。完成购买即表示您确认已评估该软件（可在 GitHub 上免费获取）并对其功能感到满意。',
    section10Item5:
      '<strong>第三方组件：</strong> 商业许可不授予以闭源方式使用 AGPL 许可的第三方组件（如 CPDF、PyMuPDF 和 Ghostscript）的权利。您必须遵守这些组件的 AGPL v3 条款，或从其各自的供应商处获取单独的商业许可。',
    section10Item6:
      '<strong>无限使用：</strong> 该许可允许在您组织内的设备、服务器和用户机器上无限制地使用，没有按用户、按机器或按席位的限制。',
    section10Footer:
      '有关完整的许可详情，请访问我们的 <a href="licensing.html" class="text-indigo-400 hover:underline">许可页面</a>。',
  },
};

function mergeKeys(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      mergeKeys(target[key], value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
  return target;
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

// Merge new keys
mergeKeys(enData, enNewKeys);

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
console.log(
  `✅ Updated en/common.json with ${Object.keys(enNewKeys).length} new sections`
);

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

// Merge new keys
mergeKeys(zhData, zhNewKeys);

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
console.log(
  `✅ Updated zh/common.json with ${Object.keys(zhNewKeys).length} new sections`
);

// Count total new keys
function countKeys(obj, prefix = '') {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      count += countKeys(value, prefix ? `${prefix}.${key}` : key);
    } else {
      count++;
    }
  }
  return count;
}

const enKeyCount = countKeys(enNewKeys) + 5; // +5 workbench keys
const zhKeyCount = countKeys(zhNewKeys) + 5;
console.log(`📊 Total new EN keys: ${enKeyCount}, ZH keys: ${zhKeyCount}`);
