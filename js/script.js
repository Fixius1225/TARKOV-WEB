const API_URL = 'https://api.tarkov.dev/graphql';

const page = document.body.dataset.page;
const statusEl = document.getElementById('status');


// nav bar gen
function getActiveNavKey(pageName) {
  const map = {
    'landing': 'home',
    'items-list': 'stash',
    'item-detail': 'stash',
    'traders': 'traders',
    'maps': 'maps',
    'hideout': 'hideout'
  };

  return map[pageName] || 'home';
}

function renderSiteNav() {
  const navHost = document.getElementById('site-nav');
  if (!navHost) return;

  const activeKey = getActiveNavKey(page);

  const navItems = [
    { key: 'home', label: 'Home', href: 'index.html' },
    { key: 'stash', label: 'Stash', href: 'items_list.html' },
    { key: 'traders', label: 'Traders', href: 'traders.html' },
    { key: 'maps', label: 'Maps', href: '#' },
    { key: 'hideout', label: 'Hideout', href: '#' }
  ];

  navHost.innerHTML = `
    <nav class="hero-nav">
      <ul class="hero-nav-list list-unstyled mb-0">
        ${navItems.map(item => `
          <li class="hero-nav-item ${item.key === activeKey ? 'is-current' : ''}">
            <a href="${item.href}" class="hero-tab">
              <span class="hero-tab-label">${item.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
      <div class="nav-divider"></div>
    </nav>
  `;
}

//----------------------------------


function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

function formatRub(value) {
  if (value == null) return 'N/D';
  return `${Number(value).toLocaleString('es-ES')} ₽`;
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

async function graphqlRequest(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message || 'GraphQL error');
  }

  return json.data;
}

function initTheme() {
  const themeBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme');

  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');

    const theme = document.body.classList.contains('light-theme')
      ? 'light'
      : 'dark';

    localStorage.setItem('theme', theme);
  });
}

function initItemsListPage() {
  const controlsHost = document.getElementById('controls');
  const itemsEl = document.getElementById('items');

  let allItems = [];
  let currentFilter = 'All';
  let searchTerm = '';

  const FILTER_PRESETS = {
    All: [],
    Weapons: ['rifle','pistol','ak','m4','shotgun','smg','svd','gun','mosin'],
    Medical: ['medkit','salewa','grizzly','bandage','painkiller','injector'],
    Maps: ['map','shoreline','customs','reserve','woods','interchange']
  };

  controlsHost.innerHTML = `
    <div class="controls-container">
      <input type="search" id="search" placeholder="BUSCAR EQUIPAMIENTO...">
      <div id="filters"></div>
    </div>
  `;

  const searchEl = document.getElementById('search');
  const filtersEl = document.getElementById('filters');

  function renderFilters() {
    filtersEl.innerHTML = Object.keys(FILTER_PRESETS).map(name => `
      <button
        type="button"
        class="filter-btn ${name === currentFilter ? 'active' : ''}"
        data-filter="${name}"
      >
        ${name}
      </button>
    `).join('');
  }

  function getFilteredItems() {
    return allItems.filter(item => {
      const text = `${item.name || ''} ${item.shortName || ''}`.toLowerCase();
      const matchesSearch = text.includes(searchTerm);

      const keywords = FILTER_PRESETS[currentFilter] || [];
      const matchesFilter =
        currentFilter === 'All' ||
        keywords.some(keyword => text.includes(keyword));

      return matchesSearch && matchesFilter;
    });
  }

  function renderItems() {
    const filtered = getFilteredItems();

    statusEl.textContent = `${filtered.length} objetos localizados`;

    if (!filtered.length) {
      itemsEl.innerHTML = `<p class="text-center">No se encontraron resultados.</p>`;
      return;
    }

    itemsEl.innerHTML = filtered.map(item => `
      <article class="item-card">
        <div class="item-image-wrapper">
          <img src="${escapeHtml(item.iconLink || '')}" alt="${escapeHtml(item.name || 'item')}">
        </div>

        <div class="item-info">
          <a href="item.html?id=${encodeURIComponent(item.id)}" class="item-name">
            ${escapeHtml(item.name || 'Sin nombre')}
          </a>
          <span class="item-shortname">${escapeHtml(item.shortName || '')}</span>
        </div>

        <div class="item-footer">
          <span class="price-label">Precio bajo</span>
          <span class="price-value">${formatRub(item.lastLowPrice)}</span>
        </div>
      </article>
    `).join('');
  }

  async function loadItems() {
    statusEl.textContent = 'Sincronizando datos...';

    try {
      const query = `
        query GetItems {
          items {
            id
            name
            shortName
            iconLink
            lastLowPrice
          }
        }
      `;

      const data = await graphqlRequest(query);
      allItems = data?.items || [];
      renderFilters();
      renderItems();
    } catch (error) {
      console.error(error);
      statusEl.textContent = 'Error de conexión';
      itemsEl.innerHTML = '';
    }
  }

  searchEl.addEventListener('input', debounce((e) => {
    searchTerm = (e.target.value || '').trim().toLowerCase();
    renderItems();
  }));

  filtersEl.addEventListener('click', (e) => {
    const button = e.target.closest('[data-filter]');
    if (!button) return;

    currentFilter = button.dataset.filter;
    renderFilters();
    renderItems();
  });

  renderFilters();
  loadItems();
}

function initItemDetailPage() {
  const itemEl = document.getElementById('item');
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');

  if (!itemId) {
    statusEl.textContent = 'ID de objeto no encontrado';
    return;
  }

  async function loadItem() {
    statusEl.textContent = 'Cargando detalles...';

    try {
      const query = `
        query GetItem($id: ID!) {
          item(id: $id) {
            id
            name
            shortName
            description
            iconLink
            link
            lastLowPrice
          }
        }
      `;

      const data = await graphqlRequest(query, { id: itemId });
      const item = data?.item;

      if (!item) {
        statusEl.textContent = 'Objeto no encontrado';
        return;
      }

      renderItem(item);
    } catch (error) {
      console.error(error);
      statusEl.textContent = 'Error al cargar el objeto';
    }
  }

  function renderItem(item) {
    statusEl.textContent = '';

    const storageKey = `price_${item.id}`;
    let priceHistory = JSON.parse(localStorage.getItem(storageKey)) || [];

    if (
      priceHistory.length === 0 ||
      priceHistory[priceHistory.length - 1].price !== item.lastLowPrice
    ) {
      priceHistory.push({
        price: item.lastLowPrice,
        date: new Date().toLocaleDateString('es-ES')
      });

      if (priceHistory.length > 10) {
        priceHistory = priceHistory.slice(-10);
      }

      localStorage.setItem(storageKey, JSON.stringify(priceHistory));
    }

    let priceHistoryHtml = '';

    if (priceHistory.length > 1) {
      const previousPrices = priceHistory
        .slice(0, -1)
        .reverse()
        .map(p => `${formatRub(p.price)} <span class="text-secondary">(${p.date})</span>`)
        .join('<br>');

      priceHistoryHtml = `
        <div class="price-history">
          <p class="mb-2 fw-bold">Historial de precios</p>
          <p class="mb-0">${previousPrices}</p>
        </div>
      `;
    }

    itemEl.innerHTML = `
      <article class="item-card item-detail-card">
        <h2 class="item-detail-title">${escapeHtml(item.name)}</h2>

        <div class="item-image-wrapper mb-3">
          <img src="${escapeHtml(item.iconLink || '')}" alt="${escapeHtml(item.name)}">
        </div>

        <p><strong>${escapeHtml(item.shortName || '')}</strong></p>
        <p class="item-detail-description">${escapeHtml(item.description || 'Sin descripción.')}</p>

        <div class="item-footer">
          <span class="price-label">Precio actual</span>
          <span class="price-value">${formatRub(item.lastLowPrice)}</span>
        </div>

        ${priceHistoryHtml}

        ${
          item.link
            ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-name mt-3">Ver en la wiki oficial</a>`
            : ''
        }
      </article>
    `;
  }

  loadItem();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteNav();
  initTheme();

  if (page === 'items-list') {
    initItemsListPage();
  }

  if (page === 'item-detail') {
    initItemDetailPage();
  }
});