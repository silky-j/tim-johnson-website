// News & Publications Component Controller for Timothy P. Johnson
(function () {
  const root = document.getElementById('news-grid-root');
  if (!root) return;

  // State variables
  let selectedCategory = 'all';
  let currentSize = 3;
  let currentPage = 1;
  let paginatedMode = false;
  const itemsPerPage = 9;

  const newsData = (window.NEWS_DATA || []).slice();

  // Category labels and display text
  const CATEGORIES = [
    { slug: 'all', label: 'All Updates' },
    { slug: 'news', label: 'In the News' },
    { slug: 'press', label: 'Press Releases' },
    { slug: 'publication', label: 'Publications' },
    { slug: 'award', label: 'Awards' }
  ];

  const BADGE_CONFIG = {
    news: { label: 'In the News', className: 'badge-news' },
    press: { label: 'Press Release', className: 'badge-press' },
    publication: { label: 'Publication', className: 'badge-publication' },
    award: { label: 'Award', className: 'badge-award' }
  };

  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Date formatting: e.g. "2026-05-19" -> "May 19, 2026"
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  }

  function cardHTML(item) {
    const badge = BADGE_CONFIG[item.category] || { label: 'News', className: 'badge-news' };
    const dateFormatted = formatDate(item.date);
    
    return `
      <article class="card news-card-item">
        <div class="news-card-header">
          <span class="news-badge ${badge.className}">${esc(badge.label)}</span>
          <span class="news-card-date">${esc(dateFormatted)}</span>
        </div>
        <h3 class="news-card-title">
          <a href="${esc(item.url)}" target="_blank" rel="noopener" class="news-title-link">
            ${esc(item.title)}
            <i data-lucide="external-link" class="link-ic"></i>
          </a>
        </h3>
        <p class="news-card-snippet">${esc(item.snippet)}</p>
        <div class="news-card-footer">
          <span class="news-source-label">Source:</span>
          <span class="news-source-name">${esc(item.source)}</span>
        </div>
      </article>
    `;
  }

  function renderFilters() {
    const filterContainer = document.getElementById('news-filters');
    if (!filterContainer) return;

    filterContainer.innerHTML = CATEGORIES.map(cat => {
      // Calculate counts for each category
      const count = cat.slug === 'all' 
        ? newsData.length 
        : newsData.filter(item => item.category === cat.slug).length;

      const activeClass = cat.slug === selectedCategory ? 'active' : '';
      return `
        <button class="filter-tab ${activeClass}" data-category="${cat.slug}">
          ${esc(cat.label)} <span class="tab-count">${count}</span>
        </button>
      `;
    }).join('');

    // Attach click events
    filterContainer.querySelectorAll('.filter-tab').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = button.getAttribute('data-category');
        currentSize = 3;
        currentPage = 1;
        paginatedMode = false;
        render();
      });
    });
  }

  function render() {
    renderFilters();

    // Filter news items
    const filtered = selectedCategory === 'all' 
      ? newsData 
      : newsData.filter(item => item.category === selectedCategory);

    const gridContainer = document.getElementById('news-grid-root');
    const controlsContainer = document.getElementById('news-controls');
    
    if (!gridContainer) return;

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="news-empty-state">
          <i data-lucide="newspaper"></i>
          <p>No recent updates in this category.</p>
        </div>
      `;
      if (controlsContainer) controlsContainer.innerHTML = '';
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      return;
    }

    // Determine slice of items to display
    let visibleItems = [];
    if (paginatedMode) {
      const start = (currentPage - 1) * itemsPerPage;
      visibleItems = filtered.slice(start, start + itemsPerPage);
    } else {
      visibleItems = filtered.slice(0, currentSize);
    }

    // Render cards
    gridContainer.innerHTML = visibleItems.map(cardHTML).join('');

    // Render controls (Load More or Pagination)
    if (controlsContainer) {
      if (filtered.length <= 3) {
        controlsContainer.innerHTML = '';
      } else if (!paginatedMode && currentSize < 9 && currentSize < filtered.length) {
        // Show Load More button
        controlsContainer.innerHTML = `
          <button class="btn btn-ghost load-more-btn">
            <i data-lucide="plus-circle"></i> Load More
          </button>
        `;
        controlsContainer.querySelector('.load-more-btn').addEventListener('click', () => {
          currentSize += 3;
          if (currentSize >= 9 || currentSize >= filtered.length) {
            currentSize = 9;
            if (filtered.length > 9) {
              paginatedMode = true;
              currentPage = 1;
            }
          }
          render();
        });
      } else if (filtered.length > 9) {
        // We are in paginated mode
        paginatedMode = true;
        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        
        let pageButtons = '';
        for (let i = 1; i <= totalPages; i++) {
          const activeClass = i === currentPage ? 'active' : '';
          pageButtons += `
            <button class="page-btn ${activeClass}" data-page="${i}">${i}</button>
          `;
        }

        controlsContainer.innerHTML = `
          <div class="news-pagination">
            <button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}>
              <i data-lucide="chevron-left"></i>
            </button>
            <div class="page-numbers">${pageButtons}</div>
            <button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}>
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
        `;

        // Pagination event listeners
        controlsContainer.querySelectorAll('.page-numbers button').forEach(btn => {
          btn.addEventListener('click', () => {
            currentPage = parseInt(btn.getAttribute('data-page'), 10);
            render();
            // Scroll back to top of news section for user convenience
            const section = document.getElementById('news-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
            }
          });
        });

        const prevBtn = controlsContainer.querySelector('.prev-btn');
        if (prevBtn && currentPage > 1) {
          prevBtn.addEventListener('click', () => {
            currentPage--;
            render();
            const section = document.getElementById('news-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          });
        }

        const nextBtn = controlsContainer.querySelector('.next-btn');
        if (nextBtn && currentPage < totalPages) {
          nextBtn.addEventListener('click', () => {
            currentPage++;
            render();
            const section = document.getElementById('news-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          });
        }
      } else {
        controlsContainer.innerHTML = '';
      }
    }

    // Re-render Lucide icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Initial render call
  render();
})();
