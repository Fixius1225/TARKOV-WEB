/* =========================
   1. CONFIGURACIÓN GENERAL
========================= */

/* ==== Constantes base ==== */

const API_URL = 'https://api.tarkov.dev/graphql';
const page = document.body.dataset.page;
const statusEl = document.getElementById('status');


/* =========================
   2. NAVBAR GLOBAL
========================= */

/* ==== Mapeo de página activa ==== */
function getActiveNavKey(pageName) {
  const map = {
    'landing': 'home',
    'items-list': 'stash',
    'item-detail': 'stash',
    'traders': 'traders',
    'trader-detail': 'traders',
    'maps': 'maps',
    'hideout': 'hideout'
  };

  return map[pageName] || 'home';
}

/* ==== Render de la navbar ==== */

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


/* =========================
   3. UTILIDADES GENERALES
========================= */

/* ==== Escape HTML ==== */

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

/* ==== Formato de rublos ==== */

function formatRub(value) {
  if (value == null) return 'N/D';
  return `${Number(value).toLocaleString('es-ES')} ₽`;
}

/* ==== Debounce ==== */

function debounce(fn, wait = 200) {
  let t;

  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}


/* =========================
   4. TEMA CLARO / OSCURO
========================= */

/* ==== Inicialización del tema ==== */

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


/* =========================
   5. API 
========================= */

/* ==== Request genérica ==== */

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


/* =========================
   6. ITEMS LIST PAGE
========================= */

/* ==== Página de listado de items ==== */

function initItemsListPage() {
  const controlsHost = document.getElementById('controls');
  const itemsEl = document.getElementById('items');

  if (!controlsHost || !itemsEl) return;

  let allItems = [];
  let currentFilter = 'All';
  let searchTerm = '';

  const FILTER_PRESETS = {
    All: [],
    Weapons: ['rifle', 'pistol', 'ak', 'm4', 'shotgun', 'smg', 'svd', 'gun', 'mosin'],
    Medical: ['medkit', 'salewa', 'grizzly', 'bandage', 'painkiller', 'injector'],
    Maps: ['map', 'shoreline', 'customs', 'reserve', 'woods', 'interchange']
  };

  /* ==== Render de controles ==== */

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

  /* ==== Filtrado ==== */

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

  /* ==== Render de items ==== */

  function renderItems() {
    const filtered = getFilteredItems();

    if (statusEl) {
      statusEl.textContent = `${filtered.length} objetos localizados`;
    }

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
          <a
            href="item.html?id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent('items_list.html')}"
            class="item-name"
          >
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

  /* ==== Carga desde la API ==== */

  async function loadItems() {
    if (statusEl) {
      statusEl.textContent = 'Sincronizando datos...';
    }

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

      if (statusEl) {
        statusEl.textContent = 'Error de conexión';
      }

      itemsEl.innerHTML = '';
    }
  }

  /* ==== Eventos ==== */

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

  /* ==== Init local ==== */

  renderFilters();
  loadItems();
}


/* =========================
   7. ITEM DETAIL PAGE
========================= */

/* ==== Página de detalle de item ==== */

function initItemDetailPage() {
  const itemEl = document.getElementById('item');
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');
  const backLink = document.getElementById('back-link');
  const returnTo = params.get('returnTo');

  if (!itemEl) return;

  if (!itemId) {
    if (statusEl) {
      statusEl.textContent = 'ID de objeto no encontrado';
    }
    return;
  }

  /* ==== Configurar botón volver ==== */

  if (backLink && returnTo) {
    backLink.href = returnTo;

    if (returnTo.includes('trader_detail.html')) {
      backLink.textContent = '← Volver al trader';
    } else {
      backLink.textContent = '← Volver al inventario';
    }
  }

  /* ==== Carga item ==== */

  async function loadItem() {
    if (statusEl) {
      statusEl.textContent = 'Cargando detalles...';
    }

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
        if (statusEl) {
          statusEl.textContent = 'Objeto no encontrado';
        }
        return;
      }

      renderItem(item);
    } catch (error) {
      console.error(error);

      if (statusEl) {
        statusEl.textContent = 'Error al cargar el objeto';
      }
    }
  }

  /* ==== Render item ==== */

  function renderItem(item) {
    if (statusEl) {
      statusEl.textContent = '';
    }

    document.title = `${item.name} | Tarkov`;

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


/* =========================
   8. TRADER DETAIL PAGE
========================= */

/* ==== Meta local del trader ==== */

const TRADER_META = {
  prapor: {
    normalizedName: 'prapor',
    name: 'Prapor',
    image: 'img/traders/Prapor_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Comerciante centrado en armamento, munición y equipamiento militar.'
  },
  therapist: {
    normalizedName: 'therapist',
    name: 'Therapist',
    image: 'img/traders/Therapist_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Especialista en suministros médicos y objetos de apoyo.'
  },
  fence: {
    normalizedName: 'fence',
    name: 'Fence',
    image: 'img/traders/Fence_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Comerciante de ofertas variadas y perfil imprevisible.'
  },
  skier: {
    normalizedName: 'skier',
    name: 'Skier',
    image: 'img/traders/Skier_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Trader orientado a equipo, armas y recursos prácticos.'
  },
  peacekeeper: {
    normalizedName: 'peacekeeper',
    name: 'Peacekeeper',
    image: 'img/traders/Peacekeeper_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Comerciante ligado a material táctico y equipamiento avanzado.'
  },
  mechanic: {
    normalizedName: 'mechanic',
    name: 'Mechanic',
    image: 'img/traders/Mechanic_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Especialista en modificaciones, herramientas y piezas técnicas.'
  },
  ragman: {
    normalizedName: 'ragman',
    name: 'Ragman',
    image: 'img/traders/Ragman_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Trader orientado a armaduras, mochilas y gear defensivo.'
  },
  jaeger: {
    normalizedName: 'jaeger',
    name: 'Jaeger',
    image: 'img/traders/Jaeger_Portrait.webp',
    role: 'Trader',
    descriptionFallback: 'Comerciante asociado a supervivencia, caza y equipamiento rústico.'
  }
};

/* ==== Helpers trader detail ==== */

function getPrimaryRewardItem(barter) {
  return barter?.rewardItems?.[0]?.item || null;
}

function getRequirementList(barter) {
  if (!barter?.requiredItems?.length) return [];

  return barter.requiredItems.map(req => {
    const count = req?.count ?? 1;
    const itemName = req?.item?.name || 'Item';
    return `${count} × ${itemName}`;
  });
}

/* ==== Render cabecera trader ==== */

function renderTraderHeader(meta, offersCount, description) {
  return `
    <div class="trader-detail-header">
      <div class="trader-detail-image">
        <img src="${escapeHtml(meta.image)}" alt="${escapeHtml(meta.name)}">
      </div>

      <div class="trader-detail-info">
        <h1 class="trader-detail-name">${escapeHtml(meta.name)}</h1>
        <p class="trader-detail-role">${escapeHtml(meta.role)}</p>
        <p class="trader-detail-description">${escapeHtml(description)}</p>

        <div class="trader-detail-tags">
          <span class="trader-tag">Trader</span>
          <span class="trader-tag">Live data</span>
          <span class="trader-tag">${offersCount} offers</span>
        </div>
      </div>
    </div>
  `;
}

/* ==== Render de ofertas ==== */

function renderTraderOffers(barters, returnToUrl) {
  if (!barters.length) {
    return `
      <div class="trader-empty">
        No se encontraron ofertas para este trader.
      </div>
    `;
  }

  return `
    <div class="trader-offers-grid">
      ${barters.map(barter => {
        const rewardItem = getPrimaryRewardItem(barter);
        const rewardId = rewardItem?.id || '';
        const rewardName = rewardItem?.name || 'Unknown item';
        const rewardImage =
          rewardItem?.iconLink ||
          rewardItem?.gridImageLink ||
          '';
        const price = rewardItem?.lastLowPrice;
        const requirements = getRequirementList(barter);

        const cardHtml = `
          <article class="trader-offer-card">
            <div class="trader-offer-top">
              <img
                src="${escapeHtml(rewardImage)}"
                alt="${escapeHtml(rewardName)}"
                class="trader-offer-image"
              >

              <div>
                <div class="trader-offer-name">${escapeHtml(rewardName)}</div>
                <div class="trader-offer-meta">
                  Trader level ${escapeHtml(barter.level ?? 'N/D')}
                  ${barter.buyLimit ? ` · Limit ${escapeHtml(barter.buyLimit)}` : ''}
                </div>
              </div>
            </div>

            <div class="trader-offer-price">
              ${formatRub(price)}
            </div>

            <div class="trader-offer-requirements">
              <div class="trader-offer-req-title">Requirements</div>
              <div class="trader-offer-req-list">
                ${
                  requirements.length
                    ? requirements.map(req => `
                      <div class="trader-offer-req-item">${escapeHtml(req)}</div>
                    `).join('')
                    : `<div class="trader-offer-req-item">No requirements listed</div>`
                }
              </div>
            </div>
          </article>
        `;

        if (!rewardId) {
          return cardHtml;
        }

        return `
          <a
            href="item.html?id=${encodeURIComponent(rewardId)}&returnTo=${encodeURIComponent(returnToUrl)}"
            class="trader-offer-link"
          >
            ${cardHtml}
          </a>
        `;
      }).join('')}
    </div>
  `;
}

/* ==== Carga de datos del trader ==== */

async function fetchTraderPageData(meta) {
  const fullQuery = `
    query GetTraderPageData {
      traders {
        name
        normalizedName
        description
      }

      barters {
        id
        level
        buyLimit
        trader {
          name
          normalizedName
        }
        requiredItems {
          count
          item {
            id
            name
            iconLink
          }
        }
        rewardItems {
          count
          item {
            id
            name
            iconLink
            gridImageLink
            lastLowPrice
          }
        }
      }
    }
  `;

  const fallbackQuery = `
    query GetTraderBartersOnly {
      barters {
        id
        level
        buyLimit
        trader {
          name
          normalizedName
        }
        requiredItems {
          count
          item {
            id
            name
            iconLink
          }
        }
        rewardItems {
          count
          item {
            id
            name
            iconLink
            gridImageLink
            lastLowPrice
          }
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest(fullQuery);

    const allTraders = data?.traders || [];
    const allBarters = data?.barters || [];

    const traderInfo = allTraders.find(trader => {
      const normalized = (trader?.normalizedName || '').toLowerCase();
      return normalized === meta.normalizedName;
    });

    const description =
      traderInfo?.description?.trim() ||
      meta.descriptionFallback;

    return {
      description,
      barters: allBarters
    };
  } catch (error) {
    console.warn('Fallo cargando descripción del trader desde API, usando fallback local.', error);

    const data = await graphqlRequest(fallbackQuery);

    return {
      description: meta.descriptionFallback,
      barters: data?.barters || []
    };
  }
}

/* ==== Página de detalle de trader ==== */

function initTraderDetailPage() {
  const detailEl = document.getElementById('trader-detail');
  const params = new URLSearchParams(window.location.search);
  const traderKey = (params.get('trader') || '').toLowerCase();
  const meta = TRADER_META[traderKey];

  if (!detailEl) return;

  if (!meta) {
    if (statusEl) {
      statusEl.textContent = 'Trader no encontrado';
    }
    return;
  }

  document.title = `${meta.name} | Tarkov`;

  async function loadTraderData() {
    if (statusEl) {
      statusEl.textContent = 'Cargando trader...';
    }

    try {
      const data = await fetchTraderPageData(meta);
      const allBarters = data?.barters || [];
      const returnToUrl = `trader_detail.html?trader=${meta.normalizedName}`;

      const traderBarters = allBarters.filter(barter => {
        const normalized = (barter?.trader?.normalizedName || '').toLowerCase();
        return normalized === meta.normalizedName;
      });

      if (statusEl) {
        statusEl.textContent = '';
      }

      detailEl.innerHTML = `
        <article class="trader-detail-card">
          ${renderTraderHeader(meta, traderBarters.length, data.description)}

          <section class="trader-stock-section">
            <h2 class="trader-section-title">Current offers</h2>
            ${renderTraderOffers(traderBarters, returnToUrl)}
          </section>
        </article>
      `;
    } catch (error) {
      console.error(error);

      if (statusEl) {
        statusEl.textContent = 'Error al cargar el trader';
      }
    }
  }

  loadTraderData();
}


/* =========================
   10. AUDIO PLAYER
========================= */

function initAudioPlayer() {
  const audio = document.getElementById('background-audio');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const progressContainer = document.querySelector('.progress-container');
  const progressBar = document.getElementById('progress-bar');
  const muteBtn = document.getElementById('mute-btn');
  const volumeSlider = document.getElementById('volume-slider');

  if (!audio || !playPauseBtn) return;

  // Play/Pause
  playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'inline';
    } else {
      audio.pause();
      playIcon.style.display = 'inline';
      pauseIcon.style.display = 'none';
    }
  });

  // Progress bar
  audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = progress + '%';
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    audio.currentTime = percentage * audio.duration;
  });

  // Volume
  volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value;
  });

  muteBtn.addEventListener('click', () => {
    if (audio.muted) {
      audio.muted = false;
      muteBtn.textContent = '🔊';
    } else {
      audio.muted = true;
      muteBtn.textContent = '🔇';
    }
  });

  // Initial state
  if (!audio.paused) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'inline';
  }
}


/* =========================
   9. INICIALIZACIÓN GLOBAL
========================= */

document.addEventListener('DOMContentLoaded', () => {
  renderSiteNav();
  initTheme();
  initAudioPlayer();

  if (page === 'items-list') {
    initItemsListPage();
  }

  if (page === 'item-detail') {
    initItemDetailPage();
  }

  if (page === 'trader-detail') {
    initTraderDetailPage();
  }
});