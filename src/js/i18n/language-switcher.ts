import {
  supportedLanguages,
  languageNames,
  getLanguageFromUrl,
  changeLanguage,
  t,
} from './i18n';

export const createLanguageSwitcher = (): HTMLElement => {
  const currentLang = getLanguageFromUrl();

  const container = document.createElement('div');
  container.className = 'language-switcher';
  container.id = 'language-switcher';

  const button = document.createElement('button');
  button.className = 'language-switcher-button';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');

  const textSpan = document.createElement('span');
  textSpan.className = 'language-switcher-current';
  textSpan.textContent = languageNames[currentLang];

  const chevron = document.createElement('svg');
  chevron.className = 'language-switcher-chevron';
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('stroke', 'currentColor');
  chevron.setAttribute('viewBox', '0 0 24 24');
  chevron.innerHTML =
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';

  button.appendChild(textSpan);
  button.appendChild(chevron);

  const dropdown = document.createElement('div');
  dropdown.className = 'language-switcher-menu hidden';
  dropdown.setAttribute('role', 'menu');

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'language-switcher-search';

  const searchPlaceholder =
    t('nav.searchLanguage') !== 'nav.searchLanguage'
      ? t('nav.searchLanguage')
      : 'Search language…';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = searchPlaceholder;
  searchInput.className = 'language-switcher-search-input';
  searchInput.setAttribute('aria-label', searchPlaceholder);
  searchWrapper.appendChild(searchInput);
  dropdown.appendChild(searchWrapper);

  const list = document.createElement('div');
  list.className = 'language-switcher-options';
  list.setAttribute('role', 'none');

  const emptyState = document.createElement('p');
  emptyState.className = 'language-switcher-empty hidden';
  const emptyText =
    t('nav.noLanguagesFound') !== 'nav.noLanguagesFound'
      ? t('nav.noLanguagesFound')
      : 'No languages found';
  emptyState.textContent = emptyText;

  const options: HTMLButtonElement[] = [];
  supportedLanguages.forEach((lang) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `language-switcher-option ${lang === currentLang ? 'is-active' : ''}`;
    option.setAttribute('role', 'menuitem');
    option.dataset.lang = lang;
    option.dataset.searchKey = `${languageNames[lang]} ${lang}`.toLowerCase();

    const name = document.createElement('span');
    name.textContent = languageNames[lang];
    option.appendChild(name);

    option.addEventListener('click', () => {
      if (lang !== currentLang) {
        changeLanguage(lang);
      }
    });

    options.push(option);
    list.appendChild(option);
  });

  list.appendChild(emptyState);
  dropdown.appendChild(list);

  const filterOptions = (e?: Event) => {
    if (e && (e as InputEvent).isComposing) return;
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    options.forEach((option) => {
      const key = option.dataset.searchKey || '';
      const match = !query || key.includes(query);
      option.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    emptyState.classList.toggle('hidden', visible > 0);
  };

  searchInput.addEventListener('input', filterOptions);
  dropdown.addEventListener('click', (e) => {
    if (e.target instanceof HTMLButtonElement && e.target.dataset.lang) return;
    e.stopPropagation();
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dropdown.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  });

  container.appendChild(button);
  container.appendChild(dropdown);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const nextOpen = !isExpanded;
    button.setAttribute('aria-expanded', nextOpen.toString());
    dropdown.classList.toggle('hidden', !nextOpen);
    if (nextOpen) {
      searchInput.value = '';
      filterOptions();
      list.scrollTop = 0;
      requestAnimationFrame(() => searchInput.focus());
    }
  });

  document.addEventListener('click', () => {
    button.setAttribute('aria-expanded', 'false');
    dropdown.classList.add('hidden');
  });

  return container;
};

export const injectLanguageSwitcher = (): void => {
  const simpleModeContainer = document.getElementById(
    'simple-mode-lang-switcher'
  );
  if (simpleModeContainer) {
    const switcher = createLanguageSwitcher();
    simpleModeContainer.appendChild(switcher);
    return;
  }

  const followUsColumn = document.getElementById('footer-social-column');

  if (followUsColumn) {
    const socialIconsContainer = followUsColumn.querySelector('.space-x-4');

    if (socialIconsContainer) {
      const wrapper = document.createElement('div');
      wrapper.className = 'inline-flex flex-col gap-4';

      socialIconsContainer.parentNode?.insertBefore(
        wrapper,
        socialIconsContainer
      );

      wrapper.appendChild(socialIconsContainer);
      const switcher = createLanguageSwitcher();

      switcher.className = 'language-switcher language-switcher-footer';

      const button = switcher.querySelector('button');
      if (button) {
        button.className = 'language-switcher-button is-footer';
      }

      const dropdown = switcher.querySelector(
        'div[role="menu"]'
      ) as HTMLElement | null;
      if (dropdown) {
        dropdown.classList.add('is-footer');
      }

      wrapper.appendChild(switcher);
    } else {
      const switcherContainer = document.createElement('div');
      switcherContainer.className = 'mt-4 w-full';
      const switcher = createLanguageSwitcher();
      switcherContainer.appendChild(switcher);
      followUsColumn.appendChild(switcherContainer);
    }
  }
};
