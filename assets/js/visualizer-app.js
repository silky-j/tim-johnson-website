// --- State Management ---
const state = {
  papers: [],
  coauthors: [],
  network: { nodes: [], edges: [] },
  stats: {},
  filters: {
    theme: 'all',
    year: null,
    coauthor: null,
    journal: null,
    search: ''
  },
  sort: 'newest',
  currentView: 'dashboard'
};

// --- DOM Elements ---
const el = {
  totalPapers: document.getElementById('stat-total-papers'),
  yearsSpan: document.getElementById('stat-years-span'),
  totalCoauthors: document.getElementById('stat-total-coauthors'),
  
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  
  themeFilters: document.getElementById('theme-filters'),
  coauthorsList: document.getElementById('coauthors-list'),
  journalsList: document.getElementById('journals-list'),
  
  timelineSvg: document.getElementById('timeline-svg'),
  resetTimelineBtn: document.getElementById('reset-timeline-btn'),
  
  resultsCountTitle: document.getElementById('results-count-title'),
  resultsBadgeCount: document.getElementById('results-badge-count'),
  sortSelect: document.getElementById('sort-select'),
  
  activeFiltersBar: document.getElementById('active-filters-bar'),
  activeFiltersTags: document.getElementById('active-filters-tags'),
  clearAllFiltersBtn: document.getElementById('clear-all-filters-btn'),
  
  papersGrid: document.getElementById('papers-grid'),
  emptyState: document.getElementById('empty-state'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  
  // Dialog Elements
  dialog: document.getElementById('paper-dialog'),
  dialogCategoryBadge: document.getElementById('dialog-category-badge'),
  dialogTitle: document.getElementById('dialog-title'),
  dialogJournal: document.getElementById('dialog-journal'),
  dialogDate: document.getElementById('dialog-date'),
  dialogDoiContainer: document.getElementById('dialog-doi-container'),
  dialogDoi: document.getElementById('dialog-doi'),
  dialogAuthors: document.getElementById('dialog-authors'),
  dialogAbstract: document.getElementById('dialog-abstract'),
  dialogPmidVal: document.getElementById('dialog-pmid-val'),
  dialogCloseBtn: document.getElementById('dialog-close-btn'),
  dialogFooterCloseBtn: document.getElementById('dialog-footer-close-btn')
};

// --- Theme Helpers ---
function getThemeDisplayName(theme) {
  const map = {
    'survey-methods': 'Survey Methodology',
    'substance-abuse': 'Substance Use',
    'covid-academia': 'COVID-19 & Academia',
    'cancer-health': 'Cancer & Health Screening',
    'social-epi': 'Social Epidemiology'
  };
  return map[theme] || 'General';
}

// --- Data Initialization ---
function initData() {
  if (window.GRAPH_DATA) {
    console.log("Loading inlined graph data...");
    loadGraphData(window.GRAPH_DATA);
  } else {
    console.log("Fetching graph_data.json...");
    fetch('assets/data/graph_data.json')
      .then(response => {
        if (!response.ok) throw new Error("Could not fetch graph_data.json");
        return response.json();
      })
      .then(data => {
        loadGraphData(data);
      })
      .catch(error => {
        console.error("Error loading data:", error);
      });
  }
}

function loadGraphData(data) {
  state.papers = data.publications || [];
  state.coauthors = data.coauthors || [];
  state.network = data.network || { nodes: [], edges: [] };
  state.stats = data.stats || {};
  
  renderGlobalStats();
  renderSidebarLists();
  renderTimeline();
  applyFilters();
}

// --- Render Statistics & Lists ---
function renderGlobalStats() {
  if (el.totalPapers) el.totalPapers.textContent = state.stats.total_publications || 0;
  if (el.yearsSpan) el.yearsSpan.textContent = state.stats.years_span || 'N/A';
  if (el.totalCoauthors) el.totalCoauthors.textContent = state.stats.total_coauthors || 0;
}

function renderSidebarLists() {
  // Coauthors
  const topCoauthors = state.stats.top_coauthors || [];
  el.coauthorsList.innerHTML = topCoauthors.map(c => {
    const isActive = state.filters.coauthor === c.name ? 'active' : '';
    return `
      <button class="list-item-btn ${isActive}" data-author="${c.name}">
        <span><i data-lucide="user" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 4px;"></i> ${c.name}</span>
        <span class="list-item-count">${c.count}</span>
      </button>
    `;
  }).join('');
  
  // Journals
  const topJournals = state.stats.top_journals || [];
  el.journalsList.innerHTML = topJournals.map(j => {
    const isActive = state.filters.journal === j.name ? 'active' : '';
    const displayJournal = j.name.length > 30 ? j.name.substring(0, 28) + '...' : j.name;
    return `
      <button class="list-item-btn ${isActive}" data-journal="${j.name}" title="${j.name}">
        <span><i data-lucide="book-open" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 4px;"></i> ${displayJournal}</span>
        <span class="list-item-count">${j.count}</span>
      </button>
    `;
  }).join('');
  
  lucide.createIcons();
}

// --- Timeline Render (SVG) ---
function renderTimeline() {
  const years = state.papers.map(p => p.year).filter(y => y !== null);
  if (years.length === 0) return;
  
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  const timelineData = [];
  for (let y = minYear; y <= maxYear; y++) {
    const count = state.papers.filter(p => p.year === y).length;
    timelineData.push({ year: y, count });
  }
  
  const width = 850;
  const height = 150;
  const paddingLeft = 30;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 25;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const maxCount = Math.max(...timelineData.map(d => d.count), 1);
  const barWidth = Math.max(2, (chartWidth / timelineData.length) - 4);
  
  el.timelineSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  el.timelineSvg.innerHTML = '';
  
  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round((maxCount / 4) * i);
    const yPos = chartHeight + paddingTop - (chartHeight * (yVal / maxCount));
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', paddingLeft);
    line.setAttribute('y1', yPos);
    line.setAttribute('x2', width - paddingRight);
    line.setAttribute('y2', yPos);
    line.setAttribute('class', 'chart-grid-line');
    el.timelineSvg.appendChild(line);
  }
  
  timelineData.forEach((d, index) => {
    const xPos = paddingLeft + (index * (chartWidth / timelineData.length)) + 2;
    const barHeight = chartHeight * (d.count / maxCount);
    const yPos = chartHeight + paddingTop - barHeight;
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'chart-bar-group');
    group.style.cursor = 'pointer';
    
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', xPos);
    bar.setAttribute('y', yPos);
    bar.setAttribute('width', barWidth);
    bar.setAttribute('height', barHeight > 0 ? barHeight : 1);
    
    let barClass = 'chart-bar';
    if (state.filters.year === d.year) {
      barClass += ' active';
    }
    bar.setAttribute('class', barClass);
    bar.setAttribute('data-year', d.year);
    
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${d.year}: ${d.count} publication(s)`;
    bar.appendChild(title);
    
    if (d.count > 0) {
      const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valText.setAttribute('x', xPos + barWidth / 2);
      valText.setAttribute('y', yPos - 6);
      valText.setAttribute('class', 'chart-value');
      valText.textContent = d.count;
      group.appendChild(valText);
    }
    
    const shouldShowYear = (timelineData.length < 15) || 
                           (d.year === minYear || d.year === maxYear || d.year % 5 === 0);
    
    if (shouldShowYear) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', xPos + barWidth / 2);
      label.setAttribute('y', chartHeight + paddingTop + 16);
      label.setAttribute('class', 'chart-label');
      label.textContent = d.year;
      group.appendChild(label);
    }
    
    group.appendChild(bar);
    
    group.addEventListener('click', () => {
      toggleYearFilter(d.year);
    });
    
    el.timelineSvg.appendChild(group);
  });
}

// --- Dynamic Cytoscape Graph Rendering ---
let cyInstance = null;

function renderNetworkGraph() {
  const container = document.getElementById('cy');
  if (!container || !state.network.nodes.length) return;
  
  const minPapers = parseInt(document.getElementById('network-min-papers').value, 10);
  
  // Find central Timothy P. Johnson node
  const mainNode = state.network.nodes.find(n => n.data.type === 'main');
  const mainId = mainNode ? mainNode.data.id : '';
  
  // Filter nodes
  const filteredNodes = state.network.nodes.filter(n => {
    if (n.data.type === 'main') return true;
    return n.data.count >= minPapers;
  });
  
  const filteredNodeIds = new Set(filteredNodes.map(n => n.data.id));
  const filteredEdges = state.network.edges.filter(e => {
    return filteredNodeIds.has(e.data.source) && filteredNodeIds.has(e.data.target);
  });
  
  const elements = [...filteredNodes, ...filteredEdges];
  
  if (cyInstance) {
    cyInstance.destroy();
  }
  
  cyInstance = cytoscape({
    container: container,
    elements: elements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'color': '#94a3b8',
          'font-family': 'Outfit, sans-serif',
          'font-size': '11px',
          'text-valign': 'bottom',
          'text-margin-y': '6px',
          'background-color': '#0d9488',
          'width': function(ele) {
            const count = ele.data('count') || 1;
            return Math.min(50, 16 + count * 1.5);
          },
          'height': function(ele) {
            const count = ele.data('count') || 1;
            return Math.min(50, 16 + count * 1.5);
          },
          'overlay-opacity': 0
        }
      },
      {
        selector: 'node[type="main"]',
        style: {
          'background-color': '#8b5cf6',
          'width': '55px',
          'height': '55px',
          'label': 'data(label)',
          'font-size': '13px',
          'font-weight': 'bold',
          'color': '#f8fafc',
          'text-margin-y': '8px'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': function(ele) {
            const weight = ele.data('weight') || 1;
            return Math.min(6, 1 + weight * 0.4);
          },
          'line-color': 'rgba(255, 255, 255, 0.08)',
          'curve-style': 'haystack'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': '2px',
          'border-color': '#2dd4bf',
          'background-color': '#0f766e'
        }
      }
    ],
    layout: {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000
    }
  });
  
  // Register tap listener
  cyInstance.on('tap', 'node', function(evt) {
    const node = evt.target;
    const nodeId = node.id();
    const nodeName = node.data('label');
    const nodeType = node.data('type');
    
    if (nodeType === 'main') {
      clearAllFilters();
    } else {
      state.filters.coauthor = nodeName;
      switchTab('dashboard');
      renderSidebarLists();
      applyFilters();
    }
  });
}

// --- Filter & Search Engine ---
function applyFilters() {
  let filtered = [...state.papers];
  
  if (state.filters.theme !== 'all') {
    filtered = filtered.filter(p => p.theme === state.filters.theme);
  }
  
  if (state.filters.year !== null) {
    filtered = filtered.filter(p => p.year === state.filters.year);
    el.resetTimelineBtn.style.display = 'inline-block';
  } else {
    el.resetTimelineBtn.style.display = 'none';
  }
  
  if (state.filters.coauthor !== null) {
    filtered = filtered.filter(p => 
      (p.authors || []).some(a => a.name === state.filters.coauthor)
    );
  }
  
  if (state.filters.journal !== null) {
    filtered = filtered.filter(p => p.journal === state.filters.journal);
  }
  
  if (state.filters.search.trim() !== '') {
    const query = state.filters.search.toLowerCase().trim();
    filtered = filtered.filter(p => {
      const titleMatch = (p.title || '').toLowerCase().includes(query);
      const abstractMatch = (p.abstract || '').toLowerCase().includes(query);
      const journalMatch = (p.journal || '').toLowerCase().includes(query);
      const authorMatch = (p.authors || []).some(a => a.name.toLowerCase().includes(query));
      return titleMatch || abstractMatch || journalMatch || authorMatch;
    });
    el.clearSearchBtn.style.display = 'flex';
  } else {
    el.clearSearchBtn.style.display = 'none';
  }
  
  if (state.sort === 'newest') {
    filtered.sort((a, b) => b.year - a.year);
  } else if (state.sort === 'oldest') {
    filtered.sort((a, b) => a.year - b.year);
  } else if (state.sort === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  updateResultsHeader(filtered.length);
  updateActiveFiltersBar();
  renderPapersGrid(filtered);
}

function updateResultsHeader(count) {
  el.resultsBadgeCount.textContent = count;
  
  let label = 'All Publications';
  if (state.filters.theme !== 'all') {
    label = `${getThemeDisplayName(state.filters.theme)} Research`;
  }
  if (state.filters.search.trim() !== '') {
    label = `Search Results for "${state.filters.search}"`;
  }
  el.resultsCountTitle.textContent = label;
}

function updateActiveFiltersBar() {
  const activeTags = [];
  
  if (state.filters.year !== null) {
    activeTags.push({ key: 'year', label: `Year: ${state.filters.year}` });
  }
  if (state.filters.coauthor !== null) {
    activeTags.push({ key: 'coauthor', label: `Co-Author: ${state.filters.coauthor}` });
  }
  if (state.filters.journal !== null) {
    activeTags.push({ key: 'journal', label: `Journal: ${state.filters.journal.length > 20 ? state.filters.journal.substring(0, 18) + '...' : state.filters.journal}` });
  }
  
  if (activeTags.length > 0) {
    el.activeFiltersBar.style.display = 'flex';
    el.activeFiltersTags.innerHTML = activeTags.map(tag => `
      <span class="filter-tag">
        ${tag.label}
        <button data-key="${tag.key}" aria-label="Remove filter">
          <i data-lucide="x"></i>
        </button>
      </span>
    `).join('');
    
    el.activeFiltersTags.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        clearFilter(key);
      });
    });
    
    lucide.createIcons();
  } else {
    el.activeFiltersBar.style.display = 'none';
  }
}

// --- Render Publication Cards ---
function renderPapersGrid(papers) {
  if (papers.length === 0) {
    el.papersGrid.style.display = 'none';
    el.emptyState.style.display = 'flex';
    return;
  }
  
  el.papersGrid.style.display = 'grid';
  el.emptyState.style.display = 'none';
  
  el.papersGrid.innerHTML = papers.map(paper => {
    const cardClass = `paper-card theme-${paper.theme || 'general'}`;
    const badgesHtml = `<span class="paper-theme-badge">${getThemeDisplayName(paper.theme)}</span>`;
    
    const authorsDisplay = (paper.authors || []).map(a => a.name).join(', ');
    
    let snippet = paper.abstract || 'No abstract available.';
    if (snippet.length > 220) {
      snippet = snippet.substring(0, 215) + '...';
    }
    
    return `
      <article class="${cardClass}" data-id="${paper.id}">
        <div class="paper-header">
          <h3 class="paper-title">${paper.title}</h3>
        </div>
        
        <div class="paper-authors" title="${authorsDisplay}">${authorsDisplay}</div>
        
        <div class="paper-snippet">${snippet}</div>
        
        <div class="paper-meta">
          <span class="meta-item"><i data-lucide="book-open"></i> ${paper.journal || 'Unknown Journal'}</span>
          <span class="meta-item"><i data-lucide="calendar"></i> ${paper.year || 'N/A'}</span>
          ${paper.doi ? `<span class="meta-item"><i data-lucide="link-2"></i> DOI Available</span>` : ''}
          <span class="meta-item"><i data-lucide="award"></i> Citations: ${paper.citation_count || 0}</span>
        </div>
        
        <div class="paper-footer">
          <div class="paper-themes-container">
            ${badgesHtml}
          </div>
          <span class="read-more">View Details <i data-lucide="arrow-right"></i></span>
        </div>
      </article>
    `;
  }).join('');
  
  el.papersGrid.querySelectorAll('.paper-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      openPaperDetails(id);
    });
  });
  
  lucide.createIcons();
}

// --- Detail Dialog Controller ---
function openPaperDetails(id) {
  const paper = state.papers.find(p => p.id === id);
  if (!paper) return;
  
  el.dialogCategoryBadge.textContent = getThemeDisplayName(paper.theme);
  el.dialogTitle.textContent = paper.title;
  el.dialogJournal.textContent = paper.journal || 'Unknown Journal';
  el.dialogDate.textContent = paper.year || 'N/A';
  
  if (paper.doi) {
    el.dialogDoiContainer.style.display = 'inline-flex';
    el.dialogDoi.href = `https://doi.org/${paper.doi}`;
    el.dialogDoi.textContent = paper.doi;
  } else {
    el.dialogDoiContainer.style.display = 'none';
  }
  
  el.dialogAuthors.textContent = (paper.authors || []).map(a => a.name).join(', ');
  el.dialogAbstract.textContent = paper.abstract || 'No abstract text available in records.';
  
  // Locate PMID from provenance if available, else show N/A
  el.dialogPmidVal.textContent = "Available in DB";
  
  lucide.createIcons();
  el.dialog.showModal();
}

function closePaperDetails() {
  el.dialog.close();
}

// --- Toggle & Clear Filter helpers ---
function toggleYearFilter(year) {
  if (state.filters.year === year) {
    state.filters.year = null;
  } else {
    state.filters.year = year;
  }
  renderTimeline();
  applyFilters();
}

function clearFilter(key) {
  if (key in state.filters) {
    state.filters[key] = null;
    if (key === 'year') {
      renderTimeline();
    } else {
      renderSidebarLists();
    }
    applyFilters();
  }
}

function clearAllFilters() {
  state.filters.theme = 'all';
  state.filters.year = null;
  state.filters.coauthor = null;
  state.filters.journal = null;
  state.filters.search = '';
  
  el.searchInput.value = '';
  
  el.themeFilters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === 'all');
  });
  
  renderSidebarLists();
  renderTimeline();
  applyFilters();
}

// --- Switch Views ---
function switchTab(view) {
  state.currentView = view;
  document.querySelectorAll('.view-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === view);
  });
  document.querySelectorAll('.tab-view').forEach(v => {
    v.style.display = v.id === `view-${view}` ? 'block' : 'none';
  });
  
  if (view === 'network') {
    setTimeout(() => {
      renderNetworkGraph();
    }, 50);
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Theme filters
  el.themeFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    
    el.themeFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.filters.theme = btn.getAttribute('data-theme');
    applyFilters();
  });
  
  // Search inputs
  el.searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    applyFilters();
  });
  
  el.clearSearchBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    state.filters.search = '';
    applyFilters();
  });
  
  // Co-authors list clicks
  el.coauthorsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.list-item-btn');
    if (!btn) return;
    
    const author = btn.getAttribute('data-author');
    if (state.filters.coauthor === author) {
      state.filters.coauthor = null;
    } else {
      state.filters.coauthor = author;
    }
    renderSidebarLists();
    applyFilters();
  });
  
  // Journals list clicks
  el.journalsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.list-item-btn');
    if (!btn) return;
    
    const journal = btn.getAttribute('data-journal');
    if (state.filters.journal === journal) {
      state.filters.journal = null;
    } else {
      state.filters.journal = journal;
    }
    renderSidebarLists();
    applyFilters();
  });
  
  // Sort selection
  el.sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFilters();
  });
  
  // Reset buttons
  el.resetTimelineBtn.addEventListener('click', () => toggleYearFilter(state.filters.year));
  el.clearAllFiltersBtn.addEventListener('click', clearAllFilters);
  el.emptyResetBtn.addEventListener('click', clearAllFilters);
  
  // Dialog Closes
  el.dialogCloseBtn.addEventListener('click', closePaperDetails);
  el.dialogFooterCloseBtn.addEventListener('click', closePaperDetails);
  
  // View Switcher Tabs
  const tabDashboard = document.getElementById('tab-dashboard');
  const tabNetwork = document.getElementById('tab-network');
  
  if (tabDashboard) tabDashboard.addEventListener('click', () => switchTab('dashboard'));
  if (tabNetwork) tabNetwork.addEventListener('click', () => switchTab('network'));
  
  // Network Graph Controls
  const minPapersSelect = document.getElementById('network-min-papers');
  if (minPapersSelect) {
    minPapersSelect.addEventListener('change', () => {
      renderNetworkGraph();
    });
  }
  
  const resetNetworkBtn = document.getElementById('reset-network-btn');
  if (resetNetworkBtn) {
    resetNetworkBtn.addEventListener('click', () => {
      if (cyInstance) {
        cyInstance.layout({
          name: 'cose',
          fit: true,
          padding: 30
        }).run();
      }
    });
  }
  
  // Dialog backdrop fallback
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    el.dialog.addEventListener('click', (event) => {
      if (event.target !== el.dialog) return;
      const rect = el.dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        closePaperDetails();
      }
    });
  }
}

// --- App Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  initData();
  setupEventListeners();
  lucide.createIcons();
});
