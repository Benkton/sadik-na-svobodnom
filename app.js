const ADMIN_SECRET = '#garden-7421';
const STORAGE_KEY = 'sadikPlantsV1';
const AUTH_KEY = 'sadikAdminAuthV1';
const CATEGORY_KEY = 'sadikSelectedCategoryV1';

const DEFAULT_PLANTS = [
  { id: '1', name: 'Тюльпан', category: 'Тюльпаны', description: 'Яркие весенние луковицы.', photo: '', price: 35 },
  { id: '2', name: 'Роза', category: 'Розы', description: 'Классические садовые розы.', photo: '', price: 120 },
  { id: '3', name: 'Лилия', category: 'Лилии', description: 'Ароматные и эффектные цветы.', photo: '', price: 50 }
];

const FALLBACK_IMG = 'https://placehold.co/800x600?text=Фото+нет';
const isAdminPage = location.pathname.endsWith('admin.html') || location.pathname.includes('/admin');

const loadPlants = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || DEFAULT_PLANTS;
const savePlants = (plants) => localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
if (!localStorage.getItem(STORAGE_KEY)) savePlants(DEFAULT_PLANTS);

const uid = () => String(Date.now()) + Math.random().toString(36).slice(2, 8);

if (!isAdminPage) initCatalog();
else initAdmin();

function renderPlantCard(p) {
  return `
    <article class="card">
      <img src="${p.photo || FALLBACK_IMG}" alt="${escapeHtml(p.name)}" onerror="this.src='${FALLBACK_IMG}'">
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="muted"><b>Категория:</b> ${escapeHtml(p.category || 'Без категории')}</p>
        <p class="muted">${escapeHtml(p.description || '')}</p>
        <div class="price-row">
          <label>Цена растения<input type="number" value="${p.price ?? ''}" placeholder="0" disabled></label>
        </div>
      </div>
    </article>
  `;
}

function initCatalog() {
  const catalog = document.getElementById('catalog');
  const search = document.getElementById('searchInput');
  const countInfo = document.getElementById('countInfo');
  const categoryBar = document.getElementById('categoryBar');
  let selectedCategory = localStorage.getItem(CATEGORY_KEY) || 'Все';

  const getCategories = (plants) => ['Все', ...new Set(plants.map(p => p.category || 'Без категории'))];

  const renderCategories = (plants) => {
    const categories = getCategories(plants);
    categoryBar.innerHTML = categories.map(cat => `
      <button class="category-btn ${cat === selectedCategory ? 'active' : ''}" data-category="${cat}">
        ${escapeHtml(cat)}
      </button>
    `).join('');
  };

  const render = () => {
    const q = (search.value || '').trim().toLowerCase();
    const allPlants = loadPlants();
    const plants = allPlants.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      const matchCategory = selectedCategory === 'Все' || (p.category || 'Без категории') === selectedCategory;
      return matchSearch && matchCategory;
    });

    renderCategories(allPlants);
    catalog.innerHTML = plants.length
      ? plants.map(renderPlantCard).join('')
      : '<div class="panel">Ничего не найдено.</div>';

    countInfo.textContent = `Показано: ${plants.length} из ${allPlants.length}`;
  };

  search.addEventListener('input', render);
  categoryBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    selectedCategory = btn.dataset.category;
    localStorage.setItem(CATEGORY_KEY, selectedCategory);
    render();
  });

  window.addEventListener('storage', render);
  render();
}

function initAdmin() {
  const secretFail = document.getElementById('secretFail');
  const loginPanel = document.getElementById('loginPanel');
  const adminPanel = document.getElementById('adminPanel');

  if (location.hash !== ADMIN_SECRET) {
    secretFail.classList.remove('hidden');
    return;
  }

  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const addNewBtn = document.getElementById('addNewBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('plantForm');
  const list = document.getElementById('adminList');
  const fileInput = document.getElementById('plantPhotoFile');

  const fields = ['plantId', 'plantName', 'plantCategory', 'plantDesc', 'plantPrice']
    .reduce((a, id) => (a[id] = document.getElementById(id), a), {});

  const setAuth = v => localStorage.setItem(AUTH_KEY, v ? '1' : '');
  const isAuthed = () => localStorage.getItem(AUTH_KEY) === '1';

  const showForm = (plant = null) => {
    form.classList.remove('hidden');
    fields.plantId.value = plant?.id || '';
    fields.plantName.value = plant?.name || '';
    fields.plantCategory.value = plant?.category || '';
    fields.plantDesc.value = plant?.description || '';
    fields.plantPrice.value = plant?.price ?? '';
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hideForm = () => form.classList.add('hidden');

  const render = () => {
    const plants = loadPlants();
    list.innerHTML = plants.map(p => `
      <article class="admin-item">
        <img src="${p.photo || FALLBACK_IMG}" alt="${escapeHtml(p.name)}" onerror="this.src='${FALLBACK_IMG}'">
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p class="muted"><b>Категория:</b> ${escapeHtml(p.category || 'Без категории')}</p>
          <p class="muted">${escapeHtml(p.description || '')}</p>
          <p><b>Цена:</b> ${p.price ?? 0}</p>
        </div>
        <div class="item-actions">
          <button class="btn" data-edit="${p.id}">Редактировать</button>
          <button class="btn btn-secondary" data-del="${p.id}">Удалить</button>
        </div>
      </article>
    `).join('') || '<div class="panel">Каталог пуст.</div>';
  };

  const openIfAuthed = () => {
    loginPanel.classList.toggle('hidden', isAuthed());
    adminPanel.classList.toggle('hidden', !isAuthed());
    if (isAuthed()) render();
  };

  loginBtn.onclick = () => {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if (user === 'admin' && pass === 'admin123') {
      setAuth(true);
      openIfAuthed();
    } else {
      alert('Неверный логин или пароль');
    }
  };

  logoutBtn.onclick = () => {
    setAuth(false);
    openIfAuthed();
  };

  addNewBtn.onclick = () => showForm();
  cancelBtn.onclick = hideForm;

  form.onsubmit = e => {
    e.preventDefault();
    const plants = loadPlants();
    const file = fileInput.files && fileInput.files[0];

    const saveWithPhoto = (photoData) => {
      const plant = {
        id: fields.plantId.value || uid(),
        name: fields.plantName.value.trim(),
        category: fields.plantCategory.value.trim() || 'Без категории',
        description: fields.plantDesc.value.trim(),
        photo: photoData || plants.find(x => x.id === fields.plantId.value)?.photo || '',
        price: Number(fields.plantPrice.value || 0)
      };

      const idx = plants.findIndex(x => x.id === plant.id);
      if (idx >= 0) plants[idx] = plant;
      else plants.unshift(plant);

      savePlants(plants);
      render();
      hideForm();
    };

    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Выберите изображение');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => saveWithPhoto(reader.result);
      reader.readAsDataURL(file);
    } else {
      saveWithPhoto('');
    }
  };

  list.onclick = e => {
    const edit = e.target.closest('[data-edit]')?.dataset.edit;
    const del = e.target.closest('[data-del]')?.dataset.del;

    if (edit) {
      const p = loadPlants().find(x => x.id === edit);
      if (p) showForm(p);
    }

    if (del && confirm('Удалить растение?')) {
      savePlants(loadPlants().filter(x => x.id !== del));
      render();
    }
  };

  openIfAuthed();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[ch]));
}