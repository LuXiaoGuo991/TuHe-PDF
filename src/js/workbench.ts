/**
 * TuHe PDF 工作台（第一阶段：结构）
 *
 * 左侧卡片栏（收起/展开、分类、搜索、滚动）+ 右侧多标签工作区（iframe）。
 * - 点击卡片在右侧打开工具；当前标签页无任务时直接替换，有任务时才新增标签页
 * - 标签页可单独关闭；全部关闭后显示 TuHe 默认首页
 * - 关闭前检测 iframe 内是否有未完成任务（文件已上传 / 处理中），有则弹确认
 */
import { createIcons, icons } from 'lucide';
import '@phosphor-icons/web/regular';
import { createLanguageSwitcher } from './i18n/language-switcher.js';

interface WorkbenchTool {
  id: string;
  href: string;
  name: string;
  icon: string;
  subtitle?: string;
}

interface WorkbenchCategory {
  name: string;
  tools: WorkbenchTool[];
}

interface WorkbenchDeps {
  categories: WorkbenchCategory[];
  categoryTranslationKeys: Record<string, string>;
  toolTranslationKeys: Record<string, string>;
  t: (key: string, options?: Record<string, unknown>) => string;
  isToolDisabled: (id: string) => boolean;
}

interface TabEntry {
  id: string;
  title: string;
  icon: string;
  tabEl: HTMLElement;
  panelEl: HTMLElement;
  iframe: HTMLIFrameElement;
}

const RAIL_EXPANDED_KEY = 'tuhe.rail.expanded';
const BASE_TITLE_FALLBACK = 'TuHe PDF - 图合 · 浏览器端 PDF 工作台';

export const initWorkbench = (deps: WorkbenchDeps): void => {
  const rail = document.getElementById('tool-rail');
  const railCategories = document.getElementById('rail-categories');
  const railScroll = document.getElementById('rail-scroll');
  const railToggle = document.getElementById('rail-toggle');
  const searchInput = document.getElementById(
    'rail-search-input'
  ) as HTMLInputElement | null;
  const tabBar = document.getElementById('tab-bar');
  const tabList = document.getElementById('tab-list');
  const panelsHost = document.getElementById('tab-panels');
  const home = document.getElementById('tuhe-home');
  const backdrop = document.getElementById('rail-backdrop');
  const mobileRailBtn = document.getElementById('mobile-rail-btn');

  if (
    !rail ||
    !railCategories ||
    !railToggle ||
    !tabBar ||
    !tabList ||
    !panelsHost ||
    !home
  ) {
    return;
  }

  const { categories, categoryTranslationKeys, toolTranslationKeys, t } = deps;

  const tabs = new Map<string, TabEntry>();
  let activeTabId: string | null = null;

  const toolIndex = new Map<string, WorkbenchTool>();
  categories.forEach((category) => {
    category.tools.forEach((tool) => {
      if (tool.href) toolIndex.set(tool.id, tool);
    });
  });

  const translateToolName = (tool: WorkbenchTool): string => {
    const key = toolTranslationKeys[tool.name];
    return key ? t(`${key}.name`) : tool.name;
  };

  const translateToolSubtitle = (tool: WorkbenchTool): string => {
    const key = toolTranslationKeys[tool.name];
    return key ? t(`${key}.subtitle`) : tool.subtitle || '';
  };

  const refreshIcons = () => createIcons({ icons });

  /* ---------- 卡片栏渲染 ---------- */

  const createToolCard = (tool: WorkbenchTool): HTMLButtonElement => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'rail-card';
    card.dataset.toolId = tool.id;

    const name = translateToolName(tool);
    const subtitle = translateToolSubtitle(tool);
    card.title = subtitle ? `${name} — ${subtitle}` : name;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'rail-card-icon';
    if (tool.icon.startsWith('ph-')) {
      const icon = document.createElement('i');
      icon.className = `ph ${tool.icon}`;
      iconWrap.appendChild(icon);
    } else {
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', tool.icon);
      iconWrap.appendChild(icon);
    }

    const text = document.createElement('span');
    text.className = 'rail-card-text';
    const nameEl = document.createElement('span');
    nameEl.className = 'rail-card-name';
    nameEl.textContent = name;
    text.appendChild(nameEl);
    if (subtitle) {
      const subtitleEl = document.createElement('span');
      subtitleEl.className = 'rail-card-subtitle';
      subtitleEl.textContent = subtitle;
      text.appendChild(subtitleEl);
    }

    card.append(iconWrap, text);
    card.addEventListener('click', () => openTab(tool.id));
    return card;
  };

  const renderRail = () => {
    railCategories.textContent = '';

    categories.forEach((category) => {
      const tools = category.tools.filter(
        (tool) => tool.href && !deps.isToolDisabled(tool.id)
      );
      if (tools.length === 0) return;

      const group = document.createElement('div');
      group.className = 'rail-category';
      group.dataset.category = category.name;

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'rail-category-header';

      const title = document.createElement('span');
      title.className = 'rail-category-title';
      const categoryKey = categoryTranslationKeys[category.name];
      title.textContent = categoryKey ? t(categoryKey) : category.name;

      const chevron = document.createElement('i');
      chevron.setAttribute('data-lucide', 'chevron-down');
      chevron.className = 'rail-chevron w-4 h-4';

      header.append(title, chevron);

      const toolsWrap = document.createElement('div');
      toolsWrap.className = 'rail-category-tools';
      tools.forEach((tool) => toolsWrap.appendChild(createToolCard(tool)));

      header.addEventListener('click', () => {
        const collapsed = group.classList.toggle('collapsed');
        toolsWrap.style.maxHeight = collapsed
          ? '0px'
          : `${toolsWrap.scrollHeight}px`;
        if (!collapsed) {
          window.setTimeout(() => {
            if (!group.classList.contains('collapsed')) {
              toolsWrap.style.maxHeight = 'none';
            }
          }, 320);
        }
      });

      group.append(header, toolsWrap);
      railCategories.appendChild(group);
    });

    refreshIcons();
  };

  /* ---------- 搜索过滤 ---------- */

  const filterRail = (term: string) => {
    const query = term.toLowerCase().trim();
    let anyVisible = false;

    railCategories
      .querySelectorAll<HTMLElement>('.rail-category')
      .forEach((group) => {
        let groupVisible = false;
        group.querySelectorAll<HTMLElement>('.rail-card').forEach((card) => {
          const name = (
            card.querySelector('.rail-card-name')?.textContent || ''
          ).toLowerCase();
          const subtitle = (
            card.querySelector('.rail-card-subtitle')?.textContent || ''
          ).toLowerCase();
          const match =
            !query || name.includes(query) || subtitle.includes(query);
          card.style.display = match ? '' : 'none';
          if (match) groupVisible = true;
        });
        group.style.display = groupVisible ? '' : 'none';
        if (groupVisible) anyVisible = true;
      });

    let emptyEl = railCategories.querySelector<HTMLElement>('.rail-empty');
    if (!anyVisible && query) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'rail-empty';
        emptyEl.textContent = deps.t('workbench.noMatchingTools');
        railCategories.appendChild(emptyEl);
      }
    } else if (emptyEl) {
      emptyEl.remove();
    }
  };

  searchInput?.addEventListener('input', (e: Event) => {
    if ((e as any).isComposing) return;
    filterRail(searchInput.value);
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const isMac = navigator.userAgent.toUpperCase().includes('MAC');
    if ((e.ctrlKey && key === 'k') || (isMac && e.metaKey && key === 'k')) {
      e.preventDefault();
      if (!rail.classList.contains('rail-expanded')) setRailExpanded(true);
      searchInput?.focus();
    }
  });

  /* ---------- 卡片栏展开 / 收起 ---------- */

  const setRailExpanded = (expanded: boolean) => {
    rail.classList.toggle('rail-expanded', expanded);
    try {
      localStorage.setItem(RAIL_EXPANDED_KEY, JSON.stringify(expanded));
    } catch {
      /* localStorage 不可用时忽略 */
    }
  };

  railToggle.addEventListener('click', () => {
    setRailExpanded(!rail.classList.contains('rail-expanded'));
  });

  let savedExpanded: boolean;
  try {
    savedExpanded = JSON.parse(
      localStorage.getItem(RAIL_EXPANDED_KEY) || 'false'
    );
  } catch {
    savedExpanded = false;
  }
  setRailExpanded(savedExpanded);

  /* ---------- 移动端抽屉 ---------- */

  const closeMobileRail = () => {
    rail.classList.remove('mobile-open');
    backdrop?.classList.remove('show');
  };

  mobileRailBtn?.addEventListener('click', () => {
    rail.classList.add('mobile-open');
    backdrop?.classList.add('show');
  });
  backdrop?.addEventListener('click', closeMobileRail);

  /* ---------- 标签页 ---------- */

  /** 显示默认首页（保留标签页，仅切换视图） */
  const showHomeView = () => {
    activeTabId = null;
    setHomeVisible(true);
    tabs.forEach((entry) => {
      entry.tabEl.classList.remove('wb-tab-active');
      entry.panelEl.classList.remove('wb-panel-active');
    });
    document.title =
      deps.t('pageTitle') !== 'pageTitle'
        ? deps.t('pageTitle')
        : BASE_TITLE_FALLBACK;
    highlightActiveCard(null);
  };

  /**
   * 拦截 iframe 内指向站内首页的链接（如"返回工具列表"、导航栏 Logo），
   * 改为在工作区内显示 TuHe 默认首页，避免工作台嵌套加载。
   */
  const wireIframeNavigation = (iframe: HTMLIFrameElement) => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const base = import.meta.env.BASE_URL || '/';
      const goHome = () => {
        window.postMessage({ type: 'tuhe:show-home' }, window.location.origin);
      };
      // "返回工具列表"按钮是 JS 导航，需在捕获阶段拦截，阻止工具页自身的跳转
      doc.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest?.('#back-to-tools, #home-logo')) {
            e.preventDefault();
            e.stopPropagation();
            goHome();
          }
        },
        true
      );
      doc.addEventListener('click', (e) => {
        const anchor = (e.target as HTMLElement | null)?.closest?.('a');
        if (!anchor) return;
        try {
          const url = new URL(anchor.href, doc.location.href);
          const path = url.pathname.replace(/\/+$/, '') || '/';
          const basePath = base.replace(/\/+$/, '') || '/';
          const isHome =
            url.origin === window.location.origin &&
            (path === basePath ||
              path === `${basePath}/index.html` ||
              (basePath === '/' && path === '/index.html'));
          if (isHome) {
            e.preventDefault();
            window.postMessage(
              { type: 'tuhe:show-home' },
              window.location.origin
            );
          }
        } catch {
          /* 无法解析的链接放行 */
        }
      });
    } catch {
      /* 跨域时跳过 */
    }
  };

  window.addEventListener('message', (e) => {
    if (
      e.origin === window.location.origin &&
      (e.data as { type?: string })?.type === 'tuhe:show-home'
    ) {
      showHomeView();
    }
  });

  const setHomeVisible = (visible: boolean) => {
    home.classList.toggle('hidden-home', !visible);
  };

  const updateChrome = () => {
    tabBar.classList.toggle('has-tabs', tabs.size > 0);
    if (tabs.size === 0) {
      activeTabId = null;
      setHomeVisible(true);
      document.title =
        deps.t('pageTitle') !== 'pageTitle'
          ? deps.t('pageTitle')
          : BASE_TITLE_FALLBACK;
      highlightActiveCard(null);
    }
  };

  const highlightActiveCard = (toolId: string | null) => {
    railCategories
      .querySelectorAll<HTMLElement>('.rail-card')
      .forEach((card) => {
        card.classList.toggle(
          'rail-card-active',
          toolId !== null && card.dataset.toolId === toolId
        );
      });
  };

  const activateTab = (id: string) => {
    const tab = tabs.get(id);
    if (!tab) return;
    activeTabId = id;
    setHomeVisible(false);

    tabs.forEach((entry, entryId) => {
      entry.tabEl.classList.toggle('wb-tab-active', entryId === id);
      entry.panelEl.classList.toggle('wb-panel-active', entryId === id);
    });

    document.title = `${tab.title} · TuHe PDF`;
    highlightActiveCard(id);
  };

  /**
   * 检测标签页内工具是否有未完成任务：
   * 1. 工具页主动挂的 window.__tuheBusy 标记（预留钩子）
   * 2. 处理中遮罩（#loader-modal）正在显示
   * 3. 任意文件输入框中已选择文件
   */
  const isTabBusy = (tab: TabEntry): boolean => {
    try {
      const win = tab.iframe.contentWindow as
        | (Window & { __tuheBusy?: boolean })
        | null;
      if (win?.__tuheBusy) return true;

      const doc = tab.iframe.contentDocument;
      if (!doc) return false;

      const loader = doc.getElementById('loader-modal');
      if (loader && !loader.classList.contains('hidden')) return true;

      const hasFiles = Array.from(
        doc.querySelectorAll<HTMLInputElement>('input[type="file"]')
      ).some((input) => (input.files?.length || 0) > 0);
      if (hasFiles) return true;
    } catch {
      /* 跨域或加载失败时按空闲处理 */
    }
    return false;
  };

  /** 复用现有 warning-modal DOM 的确认弹窗 */
  const confirmDialog = (
    title: string,
    message: string,
    confirmText: string
  ): Promise<boolean> =>
    new Promise((resolve) => {
      const modal = document.getElementById('warning-modal');
      const titleEl = document.getElementById('warning-title');
      const messageEl = document.getElementById('warning-message');
      const cancelBtn = document.getElementById('warning-cancel-btn');
      const confirmBtn = document.getElementById('warning-confirm-btn');
      if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
        resolve(window.confirm(`${title}\n${message}`));
        return;
      }

      titleEl.textContent = title;
      messageEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = deps.t('common.cancel');

      const newCancel = cancelBtn.cloneNode(true) as HTMLElement;
      const newConfirm = confirmBtn.cloneNode(true) as HTMLElement;
      cancelBtn.replaceWith(newCancel);
      confirmBtn.replaceWith(newConfirm);

      const done = (result: boolean) => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        resolve(result);
      };
      newCancel.addEventListener('click', () => done(false));
      newConfirm.addEventListener('click', () => done(true));

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });

  const destroyTab = (id: string) => {
    const tab = tabs.get(id);
    if (!tab) return;

    tab.tabEl.classList.add('closing');
    window.setTimeout(() => {
      tab.tabEl.remove();
      tab.panelEl.remove();
    }, 180);
    tabs.delete(id);

    if (activeTabId === id) {
      const remaining = Array.from(tabs.keys());
      if (remaining.length > 0) {
        activateTab(remaining[remaining.length - 1]);
      }
    }
    updateChrome();
  };

  const closeTab = async (id: string) => {
    const tab = tabs.get(id);
    if (!tab) return;

    if (isTabBusy(tab)) {
      const confirmed = await confirmDialog(
        deps.t('workbench.closeTab'),
        deps.t('workbench.closeTabMessage', { title: tab.title }),
        deps.t('workbench.closeTabConfirm')
      );
      if (!confirmed) return;
    }
    destroyTab(id);
  };

  interface PageEntry {
    id: string;
    title: string;
    href: string;
    icon: string;
    /** 是工具卡片时传 toolId，用于卡片栏高亮 */
    toolId?: string;
  }

  /**
   * 通用标签页打开：工具页与静态页（关于/联系/许可）共用。
   * replaceTabId 传入时做原位替换：新标签直接占据旧标签的槽位，
   * 不走收起/追加动画，避免标签条上的位置跳动。
   */
  const openPage = (page: PageEntry, replaceTabId?: string) => {
    const existing = tabs.get(page.id);
    if (existing) {
      activateTab(page.id);
      closeMobileRail();
      return;
    }

    const { id, title, href, icon } = page;

    // 标签
    const tabEl = document.createElement('div');
    tabEl.className = 'wb-tab';
    if (replaceTabId) tabEl.classList.add('wb-tab-replace');
    tabEl.setAttribute('role', 'tab');
    tabEl.title = title;

    const tabIcon = document.createElement('i');
    tabIcon.className = icon.startsWith('ph-')
      ? `ph ${icon} wb-tab-icon`
      : 'wb-tab-icon';
    if (!icon.startsWith('ph-')) {
      tabIcon.setAttribute('data-lucide', icon);
    }

    const tabTitle = document.createElement('span');
    tabTitle.className = 'wb-tab-title';
    tabTitle.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'wb-tab-close';
    closeBtn.setAttribute(
      'aria-label',
      t('workbench.closeTabAria', {
        name: title,
        defaultValue: `Close ${title}`,
      })
    );
    closeBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      void closeTab(id);
    });

    tabEl.append(tabIcon, tabTitle, closeBtn);
    tabEl.addEventListener('click', () => activateTab(id));
    tabList.appendChild(tabEl);

    // 面板（iframe + 加载遮罩）
    const panelEl = document.createElement('div');
    panelEl.className = 'wb-panel';

    const loading = document.createElement('div');
    loading.className = 'wb-panel-loading';
    loading.innerHTML = `<div class="solid-spinner"></div><p>${deps.t('common.loading')}</p>`;

    const iframe = document.createElement('iframe');
    iframe.src = href;
    iframe.title = title;
    iframe.setAttribute('loading', 'lazy');
    iframe.addEventListener('load', () => {
      loading.classList.add('done');
      window.setTimeout(() => loading.remove(), 350);
      wireIframeNavigation(iframe);
    });

    panelEl.append(iframe, loading);

    if (replaceTabId) {
      const old = tabs.get(replaceTabId);
      tabs.delete(replaceTabId);
      if (old) {
        // 原位替换：位置、顺序完全不变，无位移动画
        old.tabEl.replaceWith(tabEl);
        old.panelEl.replaceWith(panelEl);
      } else {
        tabList.appendChild(tabEl);
        panelsHost.appendChild(panelEl);
      }
    } else {
      tabList.appendChild(tabEl);
      panelsHost.appendChild(panelEl);
    }

    tabs.set(id, { id, title, icon, tabEl, panelEl, iframe });

    updateChrome();
    activateTab(id);
    refreshIcons();
    closeMobileRail();

    // 新增标签滚动到可见位置；原位替换位置不变，无需滚动
    if (!replaceTabId) {
      tabEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
    }
  };

  const openTab = (toolId: string) => {
    const tool = toolIndex.get(toolId);
    if (!tool) return;
    /**
     * 标签页复用：当前活动标签页没有任务（未上传文件、未在处理）时，
     * 原位替换它，避免空闲标签页不断累积；
     * 仅当活动标签页有任务时才新增标签页。点击同一工具仍只激活已有标签页。
     */
    let replaceTabId: string | undefined;
    if (activeTabId && activeTabId !== tool.id) {
      const activeTab = tabs.get(activeTabId);
      if (activeTab && !isTabBusy(activeTab)) {
        replaceTabId = activeTabId;
      }
    }
    openPage(
      {
        id: tool.id,
        title: translateToolName(tool),
        href: tool.href,
        icon: tool.icon,
        toolId: tool.id,
      },
      replaceTabId
    );
  };

  /* ---------- 顶部导航 ---------- */

  // 语言切换器（下拉方向默认向下，不会被卡片栏裁剪）
  const topbarLang = document.getElementById('topbar-lang-switcher');
  if (topbarLang) {
    topbarLang.appendChild(createLanguageSwitcher());
  }

  // 品牌：回到 TuHe 默认首页（保留已开标签页）
  document
    .getElementById('topbar-brand')
    ?.addEventListener('click', showHomeView);

  // 静态页（关于我们 / 联系我们 / 许可）：以标签页形式在工作区打开
  document.querySelectorAll<HTMLElement>('[data-page-tab]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const { pageTab, pageTitle, pageIcon } = el.dataset;
      const href = el.getAttribute('href');
      if (!pageTab || !href) return;
      openPage({
        id: `page-${pageTab}`,
        title: pageTitle || el.textContent?.trim() || pageTab,
        href,
        icon: pageIcon || 'ph-file',
      });
    });
  });

  /* ---------- 默认首页快捷入口 ---------- */

  home.querySelectorAll<HTMLElement>('[data-open-tool]').forEach((el) => {
    el.addEventListener('click', () => {
      const toolId = el.dataset.openTool;
      if (toolId) openTab(toolId);
    });
  });

  /* ---------- 初始化 ---------- */

  renderRail();
  updateChrome();
};
