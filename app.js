const CATALOG_URL = './catalog.json';

let catalog = [];

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

async function loadCatalog() {
  const res = await fetch(CATALOG_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить catalog.json');
  catalog = await res.json();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[ch]));
}

function normalizeItem(item) {
  return {
    id: Number(item.id || Date.now()),
    name: String(item.name || '').trim(),
    category: String(item.category || 'Без категории').trim(),
    description: String(item.description || '').trim(),
    price: Number(item.price || 0),
    photoUrl: String(item.photoUrl || '').trim()
  };
}

function renderCatalog(items) {
  const root = qs('#catalog');
  if (!root) return;

  root.innerHTML = items.length ? items.map(item => `
    <article class="card">
      <img src="${escapeHtml(item.photoUrl || 'https://placehold.co/800x600?text=Фото+нет')}"
           alt="${escapeHtml(item.name)}"
           onerror="this.src='https://placehold.co/800x600?text=Фото+нет'">
      <div class="card-body">
        <h3>${escapeHtml(item.name)}</h3>
        <p class="muted"><strong>Категория:</strong> ${escapeHtml(item.category || 'Без категории')}</p>
        <p>${escapeHtml(item.description || '')}</p>
        <div class="price-row">
          <div class="price">${Number(item.price || 0)} ₽</div>
        </div>
      </div>
    </article>
  `).join('') : '<div class="panel">Каталог пуст.</div>';
}

function renderFilters() {
  const categories = ['Все', ...new Set(catalog.map(x => x.category || 'Без категории'))];

  const select = qs('#categorySelect');
  if (select) {
    select.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  const bar = qs('#categoryBar');
  if (bar) {
    bar.innerHTML = categories.map(c => `
      <button class="category-btn ${c === 'Все' ? 'active' : ''}" data-category="${escapeHtml(c)}">
        ${escapeHtml(c)}
      </button>
    `).join('');
  }
}

function filterCatalog() {
  const search = (qs('#searchInput')?.value || '').trim().toLowerCase();
  const category = qs('#categorySelect')?.value || 'Все';

  const items = catalog.filter(item => {
    const okSearch =
      !search ||
      (item.name || '').toLowerCase().includes(search) ||
      (item.description || '').toLowerCase().includes(search) ||
      (item.category || '').toLowerCase().includes(search);

    const okCategory = category === 'Все' || (item.category || 'Без категории') === category;
    return okSearch && okCategory;
  });

  renderCatalog(items);

  const count = qs('#countInfo');
  if (count) count.textContent = `Показано: ${items.length} из ${catalog.length}`;
}

async function initCatalogPage() {
  await loadCatalog();
  renderFilters();

  qs('#searchInput')?.addEventListener('input', filterCatalog);
  qs('#categorySelect')?.addEventListener('change', filterCatalog);

  qs('#categoryBar')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    const category = btn.dataset.category;

    const select = qs('#categorySelect');
    if (select) select.value = category;

    qsa('.category-btn').forEach(b => b.classList.toggle('active', b.dataset.category === category));
    filterCatalog();
  });

  filterCatalog();
}

function renderAdmin() {
  const root = qs('#adminList');
  if (!root) return;

  root.innerHTML = catalog.map((item, idx) => `
    <article class="admin-item">
      <img src="${escapeHtml(item.photoUrl || 'https://placehold.co/800x600?text=Фото+нет')}"
           alt="${escapeHtml(item.name)}"
           onerror="this.src='https://placehold.co/800x600?text=Фото+нет'">

      <div class="form-grid">
        <input data-idx="${idx}" data-field="name" value="${escapeHtml(item.name)}" placeholder="Название">
        <input data-idx="${idx}" data-field="category" value="${escapeHtml(item.category)}" placeholder="Категория">
        <textarea data-idx="${idx}" data-field="description" placeholder="Описание">${escapeHtml(item.description)}</textarea>
        <input data-idx="${idx}" data-field="price" type="number" value="${escapeHtml(item.price)}" placeholder="Цена">
        <input data-idx="${idx}" data-field="photoUrl" value="${escapeHtml(item.photoUrl)}" placeholder="Ссылка на фото">
      </div>

      <div class="item-actions">
        <button class="btn btn-secondary" data-remove="${idx}">Удалить</button>
      </div>
    </article>
  `).join('');
}

function syncAdminInputs() {
  qsa('[data-field]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      catalog[idx][field] = field === 'price' ? Number(e.target.value || 0) : e.target.value;
    });
  });

  qsa('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = Number(e.target.dataset.remove);
      catalog.splice(idx, 1);
      renderAdmin();
      syncAdminInputs();
    });
  });
}

function downloadJson(data, filename = 'catalog.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function initAdminPage() {
  await loadCatalog();
  renderAdmin();
  syncAdminInputs();

  qs('#addItemBtn')?.addEventListener('click', () => {
    catalog.unshift(normalizeItem({
      id: Date.now(),
      name: 'Новое растение',
      category: 'Без категории',
      description: '',
      price: 0,
      photoUrl: ''
    }));
    renderAdmin();
    syncAdminInputs();
  });

  qs('#downloadBtn')?.addEventListener('click', () => {
    downloadJson(catalog);
  });

  qs('#fileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);
    catalog = Array.isArray(data) ? data.map(normalizeItem) : [];

    renderAdmin();
    syncAdminInputs();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (qs('#adminList')) {
    initAdminPage().catch(err => {
      const root = qs('#adminList');
      if (root) root.innerHTML = `<div class="panel">${escapeHtml(err.message)}</div>`;
    });
  } else {
    initCatalogPage().catch(err => {
      const root = qs('#catalog');
      if (root) root.innerHTML = `<div class="panel">${escapeHtml(err.message)}</div>`;
    });
  }
});