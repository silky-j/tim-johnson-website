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
    author: null,
    journal: null,
    search: ''
  },
  allAuthors: [],
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

  authorFilterInput: document.getElementById('author-filter-input'),
  clearAuthorBtn: document.getElementById('clear-author-btn'),
  authorSuggestions: document.getElementById('author-suggestions'),
  
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

  state.allAuthors = [...new Set(
    state.papers.flatMap(p => (p.authors || []).map(a => a.name))
  )].sort((a, b) => a.localeCompare(b));

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

function renderAuthorSuggestions(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    el.authorSuggestions.style.display = 'none';
    el.authorSuggestions.innerHTML = '';
    return;
  }

  const matches = state.allAuthors
    .filter(name => name.toLowerCase().includes(q))
    .slice(0, 15);

  if (matches.length === 0) {
    el.authorSuggestions.innerHTML = `<div class="author-suggestion-empty">No matching authors</div>`;
    el.authorSuggestions.style.display = 'block';
    return;
  }

  el.authorSuggestions.innerHTML = matches.map(name => `
    <button class="list-item-btn" data-author="${name.replace(/"/g, '&quot;')}">
      <span><i data-lucide="user" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 4px;"></i> ${name}</span>
    </button>
  `).join('');
  el.authorSuggestions.style.display = 'flex';
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

// --- Canvas Radial Orbit Network ---
let orbitCanvas = null;
let orbitHovered = null;
let orbitNodes = [];
let orbitResizeObserver = null;

const ORBIT_RING_COLORS = ['#a78bfa', '#2dd4bf', '#3b82f6'];
const ORBIT_TIM_COLOR = '#a78bfa';

function hex2rgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function buildOrbitNodes(cx, cy, baseR, minPapers) {
  const coauthors = state.network.nodes.filter(n =>
    n.data.type !== 'main' && n.data.count >= minPapers
  );
  const maxCount = coauthors.reduce((m, n) => Math.max(m, n.data.count), 1);
  const rings = [[], [], []];
  coauthors.forEach(n => {
    const c = n.data.count;
    if (c >= 15) rings[0].push(n);
    else if (c >= 6) rings[1].push(n);
    else rings[2].push(n);
  });
  const radii = [baseR * 0.38, baseR * 0.63, baseR * 0.93];
  const nodes = [];
  rings.forEach((ring, ri) => {
    ring.forEach((n, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: n.data.id, label: n.data.label, count: n.data.count,
        ring: ri, x: cx + radii[ri] * Math.cos(angle),
        y: cy + radii[ri] * Math.sin(angle),
        nodeRadius: 4.5 + (n.data.count / maxCount) * 11
      });
    });
  });
  return nodes;
}

function drawOrbitNetwork() {
  if (!orbitCanvas) return;
  const ctx = orbitCanvas.getContext('2d');
  const W = orbitCanvas.width, H = orbitCanvas.height;
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * 0.44;

  ctx.clearRect(0, 0, W, H);

  // Ambient background glows
  const glowDefs = [
    { x: cx * 0.6, y: cy * 0.7, r: baseR * 0.8, color: 'rgba(139, 92, 246, 0.07)' },
    { x: cx * 1.4, y: cy * 1.3, r: baseR * 0.7, color: 'rgba(45, 212, 191, 0.06)' },
    { x: cx * 1.2, y: cy * 0.5, r: baseR * 0.6, color: 'rgba(59, 130, 246, 0.06)' }
  ];
  glowDefs.forEach(g => {
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grad.addColorStop(0, g.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dashed ring guide circles
  const ringRadii = [baseR * 0.38, baseR * 0.63, baseR * 0.93];
  ringRadii.forEach((r, ri) => {
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = hex2rgba(ORBIT_RING_COLORS[ri], 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // Draw curved edges
  orbitNodes.forEach(n => {
    const isHovered = orbitHovered && orbitHovered.id === n.id;
    const isDimmed = orbitHovered && !isHovered;
    const dx = n.x - cx, dy = n.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cpx = cx + dx * 0.5 - dy / len * 40;
    const cpy = cy + dy * 0.5 + dx / len * 40;
    const nodeColor = ORBIT_RING_COLORS[n.ring];
    const grad = ctx.createLinearGradient(cx, cy, n.x, n.y);
    grad.addColorStop(0, hex2rgba(ORBIT_TIM_COLOR, isDimmed ? 0.02 : isHovered ? 0.6 : 0.2));
    grad.addColorStop(1, hex2rgba(nodeColor, isDimmed ? 0.02 : isHovered ? 0.7 : 0.2));
    ctx.save();
    ctx.shadowBlur = isHovered ? 12 : 0;
    ctx.shadowColor = nodeColor;
    ctx.strokeStyle = grad;
    ctx.lineWidth = isHovered ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cpx, cpy, n.x, n.y);
    ctx.stroke();
    ctx.restore();
  });

  // Tim center node — outer halo
  const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
  haloGrad.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
  haloGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.12)');
  haloGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();

  // Tim center node — glowing core
  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#a78bfa';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#7c3aed';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#8b5cf6';
  ctx.fill();
  ctx.font = 'bold 10px Outfit, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TPJ', cx, cy);

  // Draw co-author nodes + labels
  orbitNodes.forEach(n => {
    const isHovered = orbitHovered && orbitHovered.id === n.id;
    const isDimmed = orbitHovered && !isHovered;
    const nodeColor = ORBIT_RING_COLORS[n.ring];

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.2 : 1;
    ctx.shadowBlur = isHovered ? 20 : 10;
    ctx.shadowColor = nodeColor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? nodeColor : hex2rgba(nodeColor, 0.75);
    ctx.fill();
    ctx.restore();

    const lastName = n.label.split(/[\s,]+/)[0];
    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.15 : isHovered ? 1 : 0.75;
    ctx.font = `${isHovered ? '600' : '400'} 10px Outfit, sans-serif`;
    ctx.fillStyle = isHovered ? '#fff' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(lastName, n.x, n.y + n.nodeRadius + 4);
    ctx.restore();
  });
}

function renderOrbitNetwork() {
  const container = document.getElementById('cy');
  if (!container || !state.network.nodes.length) return;

  let canvas = container.querySelector('canvas.orbit-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'orbit-canvas';
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:default;';
    container.innerHTML = '';
    container.appendChild(canvas);

    // Floating tooltip
    let tooltip = document.getElementById('orbit-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'orbit-tooltip';
      tooltip.style.cssText = [
        'position:fixed', 'pointer-events:none', 'display:none', 'z-index:1000',
        'background:rgba(8,11,17,0.92)', 'border:1px solid rgba(255,255,255,0.12)',
        'border-radius:8px', 'padding:10px 14px', 'font-family:Outfit,sans-serif',
        'font-size:13px', 'color:#f8fafc', 'backdrop-filter:blur(8px)',
        'box-shadow:0 8px 32px rgba(0,0,0,0.5)', 'max-width:200px', 'line-height:1.4'
      ].join(';');
      document.body.appendChild(tooltip);
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let closest = null, closestDist = Infinity;
      orbitNodes.forEach(n => {
        const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        if (d < n.nodeRadius + 8 && d < closestDist) { closestDist = d; closest = n; }
      });
      const prev = orbitHovered;
      orbitHovered = closest;
      if (closest !== prev) drawOrbitNetwork();
      const tip = document.getElementById('orbit-tooltip');
      if (closest && tip) {
        tip.style.display = 'block';
        tip.style.left = (e.clientX + 16) + 'px';
        tip.style.top = (e.clientY - 10) + 'px';
        const col = ORBIT_RING_COLORS[closest.ring];
        tip.innerHTML = `<span style="color:${col};font-weight:600">${closest.label}</span><br><span style="color:#64748b;font-size:11px">${closest.count} shared publication${closest.count !== 1 ? 's' : ''}</span>`;
        canvas.style.cursor = 'pointer';
      } else if (tip) {
        tip.style.display = 'none';
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      orbitHovered = null;
      drawOrbitNetwork();
      const tip = document.getElementById('orbit-tooltip');
      if (tip) tip.style.display = 'none';
      canvas.style.cursor = 'default';
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let clicked = null;
      orbitNodes.forEach(n => {
        const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        if (d < n.nodeRadius + 8) clicked = n;
      });
      if (clicked) {
        state.filters.coauthor = clicked.label;
        switchTab('dashboard');
        renderSidebarLists();
        applyFilters();
      }
    });

    // Redraw on container resize
    if (orbitResizeObserver) orbitResizeObserver.disconnect();
    orbitResizeObserver = new ResizeObserver(() => {
      if (orbitCanvas) {
        const c = orbitCanvas.parentElement;
        if (c) {
          orbitCanvas.width = c.offsetWidth;
          orbitCanvas.height = c.offsetHeight;
          rebuildOrbit();
        }
      }
    });
    orbitResizeObserver.observe(container);
  }

  orbitCanvas = canvas;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  rebuildOrbit();
}

function rebuildOrbit() {
  if (!orbitCanvas) return;
  const W = orbitCanvas.width, H = orbitCanvas.height;
  const minPapers = parseInt(document.getElementById('network-min-papers').value, 10);
  orbitNodes = buildOrbitNodes(W / 2, H / 2, Math.min(W, H) * 0.44, minPapers);
  drawOrbitNetwork();
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

  if (state.filters.author !== null) {
    filtered = filtered.filter(p =>
      (p.authors || []).some(a => a.name === state.filters.author)
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
  if (state.filters.author !== null) {
    activeTags.push({ key: 'author', label: `Author: ${state.filters.author}` });
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
    } else if (key === 'author') {
      el.authorFilterInput.value = '';
      el.clearAuthorBtn.style.display = 'none';
      el.authorSuggestions.style.display = 'none';
      el.authorSuggestions.innerHTML = '';
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
  state.filters.author = null;
  state.filters.journal = null;
  state.filters.search = '';

  el.searchInput.value = '';
  el.authorFilterInput.value = '';
  el.clearAuthorBtn.style.display = 'none';
  el.authorSuggestions.style.display = 'none';
  el.authorSuggestions.innerHTML = '';
  
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
      renderOrbitNetwork();
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

  // Author filter input
  el.authorFilterInput.addEventListener('input', (e) => {
    const value = e.target.value;
    el.clearAuthorBtn.style.display = value ? 'flex' : 'none';
    if (state.filters.author !== null && value !== state.filters.author) {
      state.filters.author = null;
      applyFilters();
    }
    renderAuthorSuggestions(value);
  });

  el.authorFilterInput.addEventListener('focus', () => {
    if (el.authorFilterInput.value && state.filters.author === null) {
      renderAuthorSuggestions(el.authorFilterInput.value);
    }
  });

  el.authorSuggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('.list-item-btn');
    if (!btn) return;
    const name = btn.getAttribute('data-author');
    state.filters.author = name;
    el.authorFilterInput.value = name;
    el.authorSuggestions.style.display = 'none';
    el.authorSuggestions.innerHTML = '';
    el.clearAuthorBtn.style.display = 'flex';
    applyFilters();
  });

  el.clearAuthorBtn.addEventListener('click', () => {
    el.authorFilterInput.value = '';
    el.authorSuggestions.style.display = 'none';
    el.authorSuggestions.innerHTML = '';
    el.clearAuthorBtn.style.display = 'none';
    state.filters.author = null;
    applyFilters();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#author-filter-input') &&
        !e.target.closest('#author-suggestions')) {
      el.authorSuggestions.style.display = 'none';
    }
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
      rebuildOrbit();
    });
  }

  const resetNetworkBtn = document.getElementById('reset-network-btn');
  if (resetNetworkBtn) {
    resetNetworkBtn.addEventListener('click', () => {
      rebuildOrbit();
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
