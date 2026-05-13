// ==========================================
// UTILIDADES COMPARTIDAS
// ==========================================
const STATUS = document.getElementById('status');

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// ==========================================
// LÓGICA PARA INDEX.HTML (Listado General)
// ==========================================
const ITEMS_CONTAINER = document.getElementById('items');

if (ITEMS_CONTAINER) {
  let ALL_ITEMS = [];
  let currentFilter = 'All';

  // Inyectar controles dinámicamente
  const controls = document.createElement('div');
  controls.className = 'controls-container';
  document.body.insertBefore(controls, ITEMS_CONTAINER);

  controls.innerHTML = `
    <input type="search" id="search" placeholder="BUSCAR EQUIPAMIENTO...">
    <div id="filters"></div>
  `;

  const FILTER_PRESETS = {
    'All': [],
    'Weapons': ['rifle','pistol','ak','m4','shotgun','smg','svd','gun','mosin'],
    'Medical': ['medkit','salewa','grizzly','bandage','painkiller','injector'],
    'Maps': ['map','shoreline','customs','reserve','woods','interchange']
  };

  function createFilterButtons() {
    const container = document.getElementById('filters');
    container.innerHTML = '';
    Object.keys(FILTER_PRESETS).forEach(name => {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.className = 'filter-btn' + (name === currentFilter ? ' active' : '');
      btn.onclick = () => {
        currentFilter = name;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderItemsList();
      };
      container.appendChild(btn);
    });
  }

  async function fetchItemsList() {
    STATUS.textContent = 'SINCRONIZANDO DATOS...';
    try {
      const query = `{ items { id name shortName iconLink lastLowPrice } }`;
      const res = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      ALL_ITEMS = json.data?.items || [];
      createFilterButtons();
      renderItemsList();
    } catch (err) {
      STATUS.textContent = 'ERROR DE CONEXIÓN';
    }
  }

  function renderItemsList() {
    const search = document.getElementById('search').value.toLowerCase();
    
    const filtered = ALL_ITEMS.filter(it => {
      const matchesSearch = (it.name + it.shortName).toLowerCase().includes(search);
      const keywords = FILTER_PRESETS[currentFilter];
      const matchesFilter = currentFilter === 'All' || keywords.some(k => it.name.toLowerCase().includes(k));
      return matchesSearch && matchesFilter;
    });

    STATUS.textContent = `${filtered.length} OBJETOS LOCALIZADOS`;
    ITEMS_CONTAINER.innerHTML = filtered.map(it => `
      <div class="item-card">
        <div class="item-image-wrapper">
          <img src="${it.iconLink}" alt="icon">
        </div>
        <div class="item-info">
          <a href="item.html?id=${it.id}" class="item-name">${escapeHtml(it.name)}</a>
          <span class="item-shortname">${escapeHtml(it.shortName)}</span>
        </div>
        <div class="item-footer">
          <span style="font-size:0.7rem; color:var(--text-dim)">PRECIO BAJO</span>
          <span class="price-value">${it.lastLowPrice ? it.lastLowPrice.toLocaleString() + ' ₽' : 'N/D'}</span>
        </div>
      </div>
    `).join('');
  }

  document.addEventListener('input', e => { if(e.target.id === 'search') renderItemsList(); });
  fetchItemsList();
}

// ==========================================
// LÓGICA PARA ITEM.HTML (Detalle del Objeto)
// ==========================================
const ITEM_DETAIL_CONTAINER = document.getElementById('item');

if (ITEM_DETAIL_CONTAINER) {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');

  if (itemId) {
    fetchSingleItem(itemId);
  } else {
    STATUS.textContent = 'ID de objeto no encontrado';
  }

  async function fetchSingleItem(id) {
    try {
      STATUS.textContent = 'CARGANDO DETALLES...';
      const query = `{
        item(id: "${id}") {
          id name shortName description iconLink link lastLowPrice
        }
      }`;
      const res = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      if (json.errors) {
        console.error('GraphQL Error:', json.errors);
        STATUS.textContent = 'Error en la consulta';
        return;
      }
      renderSingleItem(json.data.item);
    } catch (err) {
      console.error('Fetch Error:', err);
      STATUS.textContent = 'Error al cargar el objeto';
    }
  }

  function renderSingleItem(it) {
    STATUS.textContent = '';
    
    // Obtener historial de precios del localStorage
    const storageKey = `price_${it.id}`;
    let priceHistory = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    // Agregar precio actual si es diferente al último guardado
    if (priceHistory.length === 0 || priceHistory[priceHistory.length - 1].price !== it.lastLowPrice) {
      priceHistory.push({
        price: it.lastLowPrice,
        date: new Date().toLocaleDateString('es-ES')
      });
      // Guardar solo los últimos 10 precios
      if (priceHistory.length > 10) {
        priceHistory = priceHistory.slice(-10);
      }
      localStorage.setItem(storageKey, JSON.stringify(priceHistory));
    }
    
    // Mostrar historial (sin el precio actual, que ya está mostrado)
    let priceHistoryHtml = '';
    if (priceHistory.length > 1) {
      const previousPrices = priceHistory.slice(0, -1).reverse().map(p => 
        `${p.price.toLocaleString()} ₽ <span style="color: var(--text-dim);">(${p.date})</span>`
      ).join('<br>');
      priceHistoryHtml = `<div class="price-history">
        <p style="margin: 0 0 8px 0; font-size: 0.85rem; font-weight: bold; color: var(--accent);">HISTORIAL DE PRECIOS:</p>
        <p style="margin: 0;">${previousPrices}</p>
      </div>`;
    }
    
    ITEM_DETAIL_CONTAINER.innerHTML = `
      <div class="item-card item-detail-card" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: var(--accent);">${escapeHtml(it.name)}</h2>
        <div class="item-image-wrapper" style="border: 1px solid var(--border-color); margin: 15px 0;">
          <img src="${it.iconLink}" style="width: 120px; height: 120px;">
        </div>
        <p><strong>${escapeHtml(it.shortName)}</strong></p>
        <p style="color: var(--text-main);">${escapeHtml(it.description || 'Sin descripción.')}</p>
        <div class="item-footer">
           <span class="price-value" style="font-size: 1.5rem;">PRECIO ACTUAL: ${it.lastLowPrice ? it.lastLowPrice.toLocaleString() + ' ₽' : 'Precio no disponible'}</span>
        </div>
        ${priceHistoryHtml}
        <br>
        <a href="${it.link}" target="_blank" style="color: var(--accent);">Ver en la Wiki oficial</a>
      </div>
    `;
  }



}

// ==========================================
// LÓGICA DE CAMBIO DE TEMA
// ==========================================
//NO CAMBIA
const themeBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

// 1. Verificar si hay un tema guardado previamente
if (currentTheme === 'light') {
  document.body.classList.add('light-theme');
}

// 2. Escuchar el clic en el botón
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    // Alternar la clase en el body
    document.body.classList.toggle('light-theme');
    
    // Guardar la preferencia en localStorage
    let theme = 'dark';
    if (document.body.classList.contains('light-theme')) {
      theme = 'light';
    }
    localStorage.setItem('theme', theme);
  });
}

// ==========================================
// SELECCIÓN DE MAPAS EN MAPA.HTML
// ==========================================
const MAP_ITEMS = document.querySelectorAll('.map-item');

if (MAP_ITEMS.length > 0) {
  function clearMapSelection() {
    document.querySelectorAll('.map-item.selected').forEach(el => el.classList.remove('selected'));
  }

  MAP_ITEMS.forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('unavailable')) return;

      const alreadySelected = item.classList.contains('selected');
      clearMapSelection();

      if (!alreadySelected) {
        item.classList.add('selected');
      }
    });
  });
}
  