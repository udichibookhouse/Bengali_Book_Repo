import { BOOKS } from './books.js';

// Application State
let activeBook = null;
let activeChapterIndex = 0;
let activePage = 0;
let totalPagesInChapter = 0;

const COLUMN_GAP = 48; // Must match CSS column-gap

// User Settings (loaded from localStorage or defaults)
let settings = {
  theme: 'light',
  font: 'serif',
  fontSize: 'md', // xs, sm, md, lg, xl
  width: 'medium', // narrow, medium, wide
  height: 'relaxed' // normal, relaxed, loose
};

// Bookmarks and Progress states (loaded from localStorage)
let bookProgress = {}; // bookId -> { chapterIndex, pageIndex, percent }
let bookBookmarks = {}; // bookId -> array of { chapterIndex, pageIndex, timestamp }

// DOM Elements Cache
const el = {
  libraryView: document.getElementById('library-view'),
  libraryGrid: document.getElementById('library-grid'),
  searchBar: document.getElementById('search-bar'),
  genreFilters: document.getElementById('genre-filters'),
  headerThemeToggle: document.getElementById('header-theme-toggle'),
  
  readerView: document.getElementById('reader-view'),
  exitReader: document.getElementById('exit-reader'),
  readerTitleLabel: document.getElementById('reader-title-label'),
  readerChapterLabel: document.getElementById('reader-chapter-label'),
  bookmarkToggleBtn: document.getElementById('bookmark-toggle-btn'),
  bookmarkIcon: document.getElementById('bookmark-icon'),
  openContentsBtn: document.getElementById('open-contents-btn'),
  openSettingsBtn: document.getElementById('open-settings-btn'),
  
  readerContainer: document.getElementById('reader-container'),
  readerContent: document.getElementById('reader-content'),
  prevPageBtn: document.getElementById('prev-page-btn'),
  nextPageBtn: document.getElementById('next-page-btn'),
  readerSlider: document.getElementById('reader-slider'),
  readerPageIndicator: document.getElementById('reader-page-indicator'),
  
  settingsDrawer: document.getElementById('settings-drawer'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  fontOptions: document.getElementById('font-options'),
  fontDecBtn: document.getElementById('font-dec-btn'),
  fontIncBtn: document.getElementById('font-inc-btn'),
  fontSizeLabel: document.getElementById('font-size-label'),
  widthOptions: document.getElementById('width-options'),
  heightOptions: document.getElementById('height-options'),
  
  contentsDrawer: document.getElementById('contents-drawer'),
  closeContentsBtn: document.getElementById('close-contents-btn'),
  tabChaptersBtn: document.getElementById('tab-chapters-btn'),
  tabBookmarksBtn: document.getElementById('tab-bookmarks-btn'),
  panelChapters: document.getElementById('panel-chapters'),
  panelBookmarks: document.getElementById('panel-bookmarks'),
  
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  toast: document.getElementById('toast-message')
};

// Font Size Display mapping
const fontSizeNames = {
  'xs': 'Extra Small',
  'sm': 'Small',
  'md': 'Medium',
  'lg': 'Large',
  'xl': 'Extra Large'
};
const fontSizeSequence = ['xs', 'sm', 'md', 'lg', 'xl'];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  applySettings();
  renderLibrary();
  setupEventListeners();
});

// Load settings, progress, bookmarks from localStorage
function loadLocalStorage() {
  const savedSettings = localStorage.getItem('aura_settings');
  if (savedSettings) {
    settings = { ...settings, ...JSON.parse(savedSettings) };
  }
  
  const savedProgress = localStorage.getItem('aura_progress');
  if (savedProgress) {
    bookProgress = JSON.parse(savedProgress);
  }
  
  const savedBookmarks = localStorage.getItem('aura_bookmarks');
  if (savedBookmarks) {
    bookBookmarks = JSON.parse(savedBookmarks);
  }
}

// Save data to localStorage
function saveSettings() {
  localStorage.setItem('aura_settings', JSON.stringify(settings));
}

function saveProgress() {
  localStorage.setItem('aura_progress', JSON.stringify(bookProgress));
}

function saveBookmarks() {
  localStorage.setItem('aura_bookmarks', JSON.stringify(bookBookmarks));
}

// Theme cycling function for header button
function cycleTheme() {
  const themes = ['light', 'sepia', 'dark', 'forest'];
  const currentIndex = themes.indexOf(settings.theme);
  const nextIndex = (currentIndex + 1) % themes.length;
  settings.theme = themes[nextIndex];
  
  applySettings();
  saveSettings();
  updateDrawerSettingsUI();
  showToast(`Theme changed to ${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}`);
}

// Apply settings to DOM elements
function applySettings() {
  // Theme
  document.body.setAttribute('data-theme', settings.theme);
  
  // Font styles on reader content
  if (el.readerContent) {
    // Reset font classes
    el.readerContent.className = 'reader-content';
    el.readerContent.classList.add(`font-${settings.font}`);
    el.readerContent.classList.add(`size-${settings.fontSize}`);
    el.readerContent.classList.add(`height-${settings.height}`);
  }
  
  // Container width
  if (el.readerContainer) {
    el.readerContainer.className = 'reader-container';
    el.readerContainer.classList.add(`width-${settings.width}`);
  }
  
  // Font Size Label text
  if (el.fontSizeLabel) {
    el.fontSizeLabel.textContent = fontSizeNames[settings.fontSize];
  }
}

// Sync controls inside settings drawer with state
function updateDrawerSettingsUI() {
  // Theme dots
  document.querySelectorAll('.theme-dot').forEach(dot => {
    if (dot.getAttribute('data-theme-val') === settings.theme) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Font options
  if (el.fontOptions) {
    el.fontOptions.querySelectorAll('.btn-option').forEach(btn => {
      if (btn.getAttribute('data-font') === settings.font) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Width options
  if (el.widthOptions) {
    el.widthOptions.querySelectorAll('.btn-option').forEach(btn => {
      if (btn.getAttribute('data-width') === settings.width) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Line spacing height options
  if (el.heightOptions) {
    el.heightOptions.querySelectorAll('.btn-option').forEach(btn => {
      if (btn.getAttribute('data-height') === settings.height) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// Render library grid based on filters and search
function renderLibrary() {
  const featured = BOOKS[0];
  const featuredProgress = bookProgress[featured.id] || { chapterIndex: 0, pageIndex: 0, percent: 0 };
  const featuredStat = featuredProgress.percent > 0 ? `${featuredProgress.percent}% read` : 'Start here';

  if (document.getElementById('featured-book-card')) {
    document.getElementById('featured-book-card').innerHTML = `
      <img class="featured-cover" src="${featured.cover}" alt="${featured.title} cover" loading="eager">
      <div class="featured-copy">
        <span class="book-genre">${featured.genre}</span>
        <h3>${featured.title}</h3>
        <p class="book-author">by ${featured.author}</p>
        <p>${featured.description}</p>
        <div class="featured-meta">
          <span>${featuredStat}</span>
          <button class="read-btn" data-book-id="${featured.id}">
            ${featuredProgress.percent > 0 ? 'Resume' : 'Read now'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  el.libraryGrid.innerHTML = '';
  
  const activeGenreFilter = document.querySelector('.filter-btn.active').getAttribute('data-genre').toLowerCase();
  const searchVal = el.searchBar.value.toLowerCase().trim();
  
  const filteredBooks = BOOKS.filter(book => {
    // Genre match
    const matchesGenre = activeGenreFilter === 'all' || book.genre.toLowerCase().includes(activeGenreFilter);
    
    // Search match
    const matchesSearch = !searchVal || 
      book.title.toLowerCase().includes(searchVal) || 
      book.author.toLowerCase().includes(searchVal) || 
      book.description.toLowerCase().includes(searchVal);
      
    return matchesGenre && matchesSearch;
  });
  
  if (filteredBooks.length === 0) {
    el.libraryGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-secondary); font-weight: 300;">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">No books found matching filters</p>
        <p style="font-size: 0.9rem; color: var(--text-muted);">Try broadening your search term</p>
      </div>
    `;
    return;
  }
  
  filteredBooks.forEach(book => {
    const progressData = bookProgress[book.id] || { chapterIndex: 0, pageIndex: 0, percent: 0 };
    const percentStr = progressData.percent > 0 ? `${progressData.percent}% read` : 'Not started';
    
    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
      <div class="book-cover-container">
        <img class="book-cover" src="${book.cover}" alt="${book.title} Cover" loading="lazy">
        <div class="book-progress-overlay">
          <div class="book-progress-fill" style="width: ${progressData.percent}%"></div>
        </div>
      </div>
      <div class="book-card-info">
        <span class="book-genre">${book.genre}</span>
        <h2 class="book-title">${book.title}</h2>
        <p class="book-author">by ${book.author}</p>
        <p class="book-desc">${book.description}</p>
        <div class="book-card-footer">
          <span class="progress-text">${percentStr}</span>
          <button class="read-btn" data-book-id="${book.id}">
            ${progressData.percent > 0 ? 'Resume' : 'Read Now'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    `;
    
    // Clicking anywhere on the card (except footer actions or descriptions maybe) opens reader
    card.addEventListener('click', () => {
      openReader(book.id);
    });
    
    el.libraryGrid.appendChild(card);
  });

  if (filteredBooks.length > 1) {
    const shelfHeading = document.createElement('div');
    shelfHeading.className = 'shelf-note';
    shelfHeading.textContent = `Showing ${filteredBooks.length} books`;
    el.libraryGrid.prepend(shelfHeading);
  }
}

// Open Reader view
function openReader(bookId) {
  const book = BOOKS.find(b => b.id === bookId);
  if (!book) return;
  
  activeBook = book;
  
  // Set metadata labels
  el.readerTitleLabel.textContent = book.title;
  
  // Load saved progress
  const progress = bookProgress[book.id] || { chapterIndex: 0, pageIndex: 0, percent: 0 };
  activeChapterIndex = progress.chapterIndex;
  activePage = progress.pageIndex;
  
  // Update view classes
  document.body.style.overflow = 'hidden'; // Stop background scrolling
  el.readerView.classList.add('active');
  closeAllDrawers();
  
  // Load current chapter
  loadChapter(activeChapterIndex, activePage);
  
  // Re-build Contents drawer
  renderChaptersList();
  renderBookmarksList();
}

// Close Reader view
function closeReader() {
  activeBook = null;
  document.body.style.overflow = '';
  el.readerView.classList.remove('active');
  
  // Re-render library grid to show updated progress percentage
  renderLibrary();
}

// Load specific chapter and jump to page
function loadChapter(chapterIndex, targetPage = 0) {
  if (!activeBook || chapterIndex < 0 || chapterIndex >= activeBook.chapters.length) return;
  
  activeChapterIndex = chapterIndex;
  const chapter = activeBook.chapters[chapterIndex];
  
  el.readerChapterLabel.textContent = chapter.title;
  
  // Clear previous content
  el.readerContent.innerHTML = '';
  
  // Set horizontal scrolling style transform back to start before pagination math
  el.readerContent.style.transform = 'translateX(0px)';
  
  // Create and append chapter header (first page only, but browser columns flow handles it)
  const header = document.createElement('h2');
  header.className = 'chapter-heading';
  header.textContent = chapter.title;
  el.readerContent.appendChild(header);
  
  // Add paragraphs
  chapter.paragraphs.forEach(pText => {
    const p = document.createElement('p');
    p.textContent = pText;
    el.readerContent.appendChild(p);
  });
  
  // Allow DOM to render layout and compute pages
  requestAnimationFrame(() => {
    recalculatePages(targetPage);
  });
}

// Recompute total pages based on viewport sizes
function recalculatePages(targetPage = 0) {
  if (!activeBook) return;
  
  const clientWidth = el.readerContainer.querySelector('.reader-viewport').clientWidth;
  const scrollWidth = el.readerContent.scrollWidth;
  
  // Calculate total pages
  totalPagesInChapter = Math.ceil(scrollWidth / (clientWidth + COLUMN_GAP));
  
  if (totalPagesInChapter <= 0) totalPagesInChapter = 1;
  
  // Clamp target page
  activePage = Math.max(0, Math.min(targetPage, totalPagesInChapter - 1));
  
  // Update progress slider bounds
  el.readerSlider.max = totalPagesInChapter - 1;
  el.readerSlider.value = activePage;
  
  // Update label
  updatePageLabel();
  
  // Apply translation
  slideToPage(activePage);
  
  // Check bookmark state
  checkBookmarkState();
  
  // Save progress
  updateAndSaveProgressState();
}

// Apply transition translation to go to page
function slideToPage(pageIndex) {
  const clientWidth = el.readerContainer.querySelector('.reader-viewport').clientWidth;
  const translateVal = -pageIndex * (clientWidth + COLUMN_GAP);
  el.readerContent.style.transform = `translateX(${translateVal}px)`;
  
  activePage = pageIndex;
  el.readerSlider.value = pageIndex;
  
  updatePageLabel();
  checkBookmarkState();
  updateAndSaveProgressState();
}

// Turn pages
function nextPage() {
  if (activePage < totalPagesInChapter - 1) {
    slideToPage(activePage + 1);
  } else {
    // End of chapter, load next chapter
    if (activeChapterIndex < activeBook.chapters.length - 1) {
      loadChapter(activeChapterIndex + 1, 0);
      showToast(`Loading ${activeBook.chapters[activeChapterIndex + 1].title}`);
    } else {
      // End of book!
      showToast("You've finished this book! 🎉");
      // Set progress to 100%
      bookProgress[activeBook.id] = {
        chapterIndex: activeChapterIndex,
        pageIndex: activePage,
        percent: 100
      };
      saveProgress();
    }
  }
}

function prevPage() {
  if (activePage > 0) {
    slideToPage(activePage - 1);
  } else {
    // Start of chapter, load previous chapter and go to its last page
    if (activeChapterIndex > 0) {
      showToast(`Loading ${activeBook.chapters[activeChapterIndex - 1].title}`);
      // Load previous chapter. We temporarily target a high page index, 
      // the loadChapter will compute total pages and clamp it to the last page.
      loadChapter(activeChapterIndex - 1, 9999);
    }
  }
}

// Update the bottom page indicator label
function updatePageLabel() {
  el.readerPageIndicator.textContent = `Page ${activePage + 1} of ${totalPagesInChapter}`;
}

// Check and update if page is bookmarked
function checkBookmarkState() {
  if (!activeBook) return;
  const bookmarks = bookBookmarks[activeBook.id] || [];
  const isBookmarked = bookmarks.some(b => b.chapterIndex === activeChapterIndex && b.pageIndex === activePage);
  
  if (isBookmarked) {
    el.bookmarkToggleBtn.classList.add('active');
    el.bookmarkIcon.setAttribute('fill', 'currentColor');
  } else {
    el.bookmarkToggleBtn.classList.remove('active');
    el.bookmarkIcon.setAttribute('fill', 'none');
  }
}

// Add or remove bookmark on current page
function toggleBookmark() {
  if (!activeBook) return;
  
  let bookmarks = bookBookmarks[activeBook.id] || [];
  const existingIndex = bookmarks.findIndex(b => b.chapterIndex === activeChapterIndex && b.pageIndex === activePage);
  
  if (existingIndex > -1) {
    // Remove it
    bookmarks.splice(existingIndex, 1);
    showToast("Bookmark removed");
  } else {
    // Add it
    bookmarks.push({
      chapterIndex: activeChapterIndex,
      pageIndex: activePage,
      timestamp: Date.now()
    });
    showToast("Bookmark saved");
  }
  
  bookBookmarks[activeBook.id] = bookmarks;
  saveBookmarks();
  
  checkBookmarkState();
  renderBookmarksList();
}

// Calculate progress percent and save
function updateAndSaveProgressState() {
  if (!activeBook) return;
  
  // Calculate completion percentage:
  // (currentChapterIndex / totalChapters) + (currentPageIndex / totalPagesInChapter) * (1 / totalChapters)
  const totalChapters = activeBook.chapters.length;
  const chapterContribution = activeChapterIndex / totalChapters;
  const pageContribution = (activePage / totalPagesInChapter) * (1 / totalChapters);
  
  let percent = Math.round((chapterContribution + pageContribution) * 100);
  // Clamp between 0 and 99. If they finish the last page, we let nextPage mark it 100% or we can mark it 99% until complete.
  percent = Math.max(0, Math.min(percent, 99));
  
  // Keep 100% if already completed
  const currentProgress = bookProgress[activeBook.id];
  if (currentProgress && currentProgress.percent === 100 && activeChapterIndex === totalChapters - 1 && activePage === totalPagesInChapter - 1) {
    percent = 100;
  }
  
  bookProgress[activeBook.id] = {
    chapterIndex: activeChapterIndex,
    pageIndex: activePage,
    percent: percent
  };
  
  saveProgress();
}

// Side Drawers Handlers
function openDrawer(drawerEl) {
  drawerEl.classList.add('active');
  el.drawerBackdrop.classList.add('active');
}

function closeAllDrawers() {
  el.settingsDrawer.classList.remove('active');
  el.contentsDrawer.classList.remove('active');
  el.drawerBackdrop.classList.remove('active');
}

// Render content options inside drawers
function renderChaptersList() {
  if (!activeBook) return;
  el.panelChapters.innerHTML = '';
  
  activeBook.chapters.forEach((chap, idx) => {
    const activeClass = idx === activeChapterIndex ? 'active' : '';
    const item = document.createElement('button');
    item.className = `chapter-item ${activeClass}`;
    item.innerHTML = `
      <span>${chap.title}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    `;
    item.addEventListener('click', () => {
      loadChapter(idx, 0);
      closeAllDrawers();
    });
    el.panelChapters.appendChild(item);
  });
}

function renderBookmarksList() {
  if (!activeBook) return;
  el.panelBookmarks.innerHTML = '';
  
  const bookmarks = bookBookmarks[activeBook.id] || [];
  
  if (bookmarks.length === 0) {
    el.panelBookmarks.innerHTML = `
      <div style="text-align: center; padding: 40px 0; color: var(--text-muted); font-size: 0.9rem; font-weight: 300;">
        No bookmarks saved for this book. Press <strong>B</strong> or tap bookmark icon to save current page.
      </div>
    `;
    return;
  }
  
  // Sort bookmarks by chapter and page order
  bookmarks.sort((a, b) => {
    if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
    return a.pageIndex - b.pageIndex;
  });
  
  bookmarks.forEach(bm => {
    const chapTitle = activeBook.chapters[bm.chapterIndex].title;
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px; flex-grow:1; cursor:pointer;">
        <strong>${chapTitle}</strong>
        <span>Page ${bm.pageIndex + 1}</span>
      </div>
      <button class="bookmark-delete" title="Delete Bookmark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    `;
    
    // Jump to bookmark
    item.querySelector('div').addEventListener('click', () => {
      loadChapter(bm.chapterIndex, bm.pageIndex);
      closeAllDrawers();
    });
    
    // Delete bookmark
    item.querySelector('.bookmark-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(bm.chapterIndex, bm.pageIndex);
    });
    
    el.panelBookmarks.appendChild(item);
  });
}

function deleteBookmark(chapIdx, pageIdx) {
  if (!activeBook) return;
  let bookmarks = bookBookmarks[activeBook.id] || [];
  bookmarks = bookmarks.filter(b => !(b.chapterIndex === chapIdx && b.pageIndex === pageIdx));
  bookBookmarks[activeBook.id] = bookmarks;
  saveBookmarks();
  checkBookmarkState();
  renderBookmarksList();
  showToast("Bookmark removed");
}

// Show helper Toast notice
let toastTimeout;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('active');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.toast.classList.remove('active');
  }, 2500);
}

// Bind Page Events
function setupEventListeners() {
  // Search
  el.searchBar.addEventListener('input', () => {
    renderLibrary();
  });

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.read-btn');
    if (!button) return;
    const bookId = button.getAttribute('data-book-id');
    if (bookId) openReader(bookId);
  });
  
  // Theme Toggle in Header
  el.headerThemeToggle.addEventListener('click', () => {
    cycleTheme();
  });
  
  // Genre Filter Buttons
  el.genreFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      el.genreFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      renderLibrary();
    }
  });
  
  // Back to library
  el.exitReader.addEventListener('click', () => {
    closeReader();
  });
  
  // Bookmark Toggle in Reader
  el.bookmarkToggleBtn.addEventListener('click', () => {
    toggleBookmark();
  });
  
  // Drawers triggers
  el.openSettingsBtn.addEventListener('click', () => {
    updateDrawerSettingsUI();
    openDrawer(el.settingsDrawer);
  });
  
  el.closeSettingsBtn.addEventListener('click', () => {
    closeAllDrawers();
  });
  
  el.openContentsBtn.addEventListener('click', () => {
    openDrawer(el.contentsDrawer);
  });
  
  el.closeContentsBtn.addEventListener('click', () => {
    closeAllDrawers();
  });
  
  el.drawerBackdrop.addEventListener('click', () => {
    closeAllDrawers();
  });
  
  // Chapter vs Bookmarks tabs switcher
  el.tabChaptersBtn.addEventListener('click', () => {
    el.tabChaptersBtn.classList.add('active');
    el.tabBookmarksBtn.classList.remove('active');
    el.panelChapters.classList.add('active');
    el.panelBookmarks.classList.remove('active');
  });
  
  el.tabBookmarksBtn.addEventListener('click', () => {
    el.tabBookmarksBtn.classList.add('active');
    el.tabChaptersBtn.classList.remove('active');
    el.panelBookmarks.classList.add('active');
    el.panelChapters.classList.remove('active');
    renderBookmarksList();
  });
  
  // Arrow Navigation buttons
  el.prevPageBtn.addEventListener('click', prevPage);
  el.nextPageBtn.addEventListener('click', nextPage);
  
  // Bottom Progress Slider input change
  el.readerSlider.addEventListener('input', (e) => {
    slideToPage(parseInt(e.target.value));
  });
  
  // Theme Selector dot clicks inside drawer
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      settings.theme = dot.getAttribute('data-theme-val');
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      showToast(`Theme changed to ${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}`);
    });
  });
  
  // Font style changes inside drawer
  el.fontOptions.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-option')) {
      settings.font = e.target.getAttribute('data-font');
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      recalculatePages(activePage);
    }
  });
  
  // Font Size +/- clicks inside drawer
  el.fontDecBtn.addEventListener('click', () => {
    const idx = fontSizeSequence.indexOf(settings.fontSize);
    if (idx > 0) {
      settings.fontSize = fontSizeSequence[idx - 1];
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      recalculatePages(activePage);
    }
  });
  
  el.fontIncBtn.addEventListener('click', () => {
    const idx = fontSizeSequence.indexOf(settings.fontSize);
    if (idx < fontSizeSequence.length - 1) {
      settings.fontSize = fontSizeSequence[idx + 1];
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      recalculatePages(activePage);
    }
  });
  
  // Layout reading width changes inside drawer
  el.widthOptions.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-option')) {
      settings.width = e.target.getAttribute('data-width');
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      // Needs tiny timeout to allow width transition of container to finish before recalculating scroll
      setTimeout(() => recalculatePages(activePage), 310);
    }
  });
  
  // Line spacing height changes inside drawer
  el.heightOptions.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-option')) {
      settings.height = e.target.getAttribute('data-height');
      applySettings();
      saveSettings();
      updateDrawerSettingsUI();
      recalculatePages(activePage);
    }
  });
  
  // Window resizing: recalculate pagination dynamically
  window.addEventListener('resize', debounce(() => {
    if (activeBook) {
      recalculatePages(activePage);
    }
  }, 150));
  
  // Keyboard Shortcuts Navigation
  document.addEventListener('keydown', (e) => {
    if (!activeBook) return;
    
    // Ignore key presses if search input is focused (should not happen in reader, but safe guard)
    if (document.activeElement.tagName === 'INPUT') return;
    
    switch (e.key) {
      case 'ArrowRight':
      case ' ': // Spacebar
        e.preventDefault();
        nextPage();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevPage();
        break;
      case 'Escape':
        e.preventDefault();
        closeReader();
        break;
      case 'b':
      case 'B':
        e.preventDefault();
        toggleBookmark();
        break;
    }
  });
}

// Debounce helper for resize listener
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
