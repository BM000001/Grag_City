(() => {
  'use strict';

  const ROWS = 8;
  const COLS = 12;
  const STORAGE_KEY = 'dragCitCityV1';
  const TYPES = [
    { id: 'house', name: 'Casa', description: 'Moradia', icon: '⌂', color: 'house' },
    { id: 'apartment', name: 'Prédio', description: 'Moradia coletiva', icon: '▥', color: 'apartment' },
    { id: 'hospital', name: 'Hospital', description: 'Saúde e atendimento', icon: '✚', color: 'hospital' },
    { id: 'shop', name: 'Loja', description: 'Comércio local', icon: '▤', color: 'shop' },
    { id: 'school', name: 'Escola', description: 'Educação', icon: '⌑', color: 'school' },
    { id: 'park', name: 'Parque', description: 'Lazer e natureza', icon: '✿', color: 'park' },
    { id: 'tree', name: 'Árvore', description: 'Área verde', icon: '♣', color: 'tree' },
    { id: 'police', name: 'Delegacia', description: 'Segurança pública', icon: '✦', color: 'police' },
    { id: 'fire', name: 'Bombeiros', description: 'Emergência e resgate', icon: '✹', color: 'fire' },
    { id: 'road', name: 'Rua', description: 'Mobilidade urbana', icon: '━', color: 'road' }
  ];
  const byId = (id) => document.getElementById(id);
  const ui = {
    sidebar: byId('sidebar'), overlay: byId('overlay'), catalog: byId('catalog'), tiles: byId('tiles'),
    buildings: byId('buildings'), list: byId('buildingList'), emptyList: byId('emptyList'),
    filter: byId('filterType'), sort: byId('sortBy'), search: byId('searchBuildings'),
    count: byId('count'), mapCount: byId('mapCount'), pieceCount: byId('pieceCount'),
    hint: byId('hint'), message: byId('message'), saveStatus: byId('saveStatus'), removeMode: byId('removeMode'),
    dialog: byId('buildingDialog'), form: byId('buildingForm'), name: byId('buildingName'),
    status: byId('buildingStatus'), notes: byId('buildingNotes'), location: byId('dialogLocation'),
    cityInput: byId('cityInput'), weatherResult: byId('weatherResult'), weatherButton: byId('weatherButton'),
    zoomLabel: byId('zoomLabel'), map: byId('map'), islandShadow: document.querySelector('.island-shadow')
  };
  let city = readState();
  let selectedType = 'house';
  let selectedBuildingId = null;
  let removeMode = false;
  let zoom = 0.86;
  let draggedBuildingId = null;
  let draggedType = null;

  function toCell(value, size) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    if (Number.isInteger(number) && number >= 0 && number < size) return number;
    if (number >= 0 && number <= 1) return Math.min(size - 1, Math.floor(number * size));
    if (number >= 0 && number <= 100) return Math.min(size - 1, Math.floor((number / 100) * size));
    return Math.max(0, Math.min(size - 1, Math.round(number)));
  }

  function normalizeBuilding(item, index) {
    if (!item || typeof item !== 'object') return null;
    const type = TYPES.some((entry) => entry.id === item.type) ? item.type : 'house';
    const row = Number.isInteger(item.row) ? item.row : toCell(item.y, ROWS);
    const col = Number.isInteger(item.col) ? item.col : toCell(item.x, COLS);
    return {
      id: String(item.id ?? `legacy-${index}-${Date.now()}`),
      type, row, col,
      name: String(item.name || item.title || `${typeFor(type).name} ${index + 1}`).slice(0, 40),
      notes: String(item.notes || item.description || '').slice(0, 240),
      status: ['planned', 'building', 'ready'].includes(item.status) ? item.status : 'planned',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
    };
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, buildings: [], weatherCity: null };
      const parsed = JSON.parse(raw);
      const saved = Array.isArray(parsed) ? parsed : (parsed.buildings || parsed.items || []);
      const buildings = Array.isArray(saved) ? saved.map(normalizeBuilding).filter(isValidBuilding) : [];
      return { version: 1, buildings, weatherCity: parsed.weatherCity && typeof parsed.weatherCity === 'object' ? parsed.weatherCity : null };
    } catch (error) {
      return { version: 1, buildings: [], weatherCity: null };
    }
  }

  function isValidBuilding(item) {
    return item && typeof item.id === 'string' && TYPES.some((type) => type.id === item.type) &&
      Number.isInteger(item.row) && item.row >= 0 && item.row < ROWS &&
      Number.isInteger(item.col) && item.col >= 0 && item.col < COLS;
  }

  function persist(showStatus = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
      if (showStatus) {
        ui.saveStatus.textContent = 'Salvo automaticamente';
        ui.saveStatus.classList.remove('is-error');
      }
      return true;
    } catch (error) {
      ui.saveStatus.textContent = 'Não foi possível salvar';
      ui.saveStatus.classList.add('is-error');
      announce('O navegador não conseguiu salvar esta cidade. Verifique o espaço disponível.');
      return false;
    }
  }

  function typeFor(id) { return TYPES.find((type) => type.id === id); }
  function makeId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function announce(message) { ui.message.textContent = message; }
  function escapeLabel(value) { return String(value || '').trim(); }
  function occupied(row, col, exceptId = null) {
    return city.buildings.some((item) => item.row === row && item.col === col && item.id !== exceptId);
  }

  function renderCatalog() {
    ui.catalog.replaceChildren();
    const fragment = document.createDocumentFragment();
    TYPES.forEach((type) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'piece';
      button.dataset.type = type.id;
      button.draggable = true;
      button.setAttribute('aria-pressed', String(selectedType === type.id));
      const art = document.createElement('span');
      art.className = `art ${type.color}`;
      art.textContent = type.icon;
      const text = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = type.name;
      const description = document.createElement('small');
      description.textContent = type.description;
      text.append(name, description);
      const grip = document.createElement('span');
      grip.className = 'grip';
      grip.setAttribute('aria-hidden', 'true');
      grip.textContent = '⠿';
      button.append(art, text, grip);
      fragment.append(button);
    });
    ui.catalog.append(fragment);
    ui.pieceCount.textContent = `${TYPES.length} peças`;
    renderFilterOptions();
    updateSelectedPiece();
  }

  function renderFilterOptions() {
    const previous = ui.filter.value || 'all';
    ui.filter.replaceChildren();
    const all = document.createElement('option');
    all.value = 'all'; all.textContent = 'Todos'; ui.filter.append(all);
    TYPES.forEach((type) => {
      const option = document.createElement('option');
      option.value = type.id; option.textContent = type.name; ui.filter.append(option);
    });
    ui.filter.value = previous;
  }

  function updateSelectedPiece() {
    ui.catalog.querySelectorAll('.piece').forEach((button) => {
      const active = button.dataset.type === selectedType;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const type = typeFor(selectedType);
    ui.hint.textContent = removeMode ? 'Abra a construção e escolha Excluir nos detalhes' : `Peça selecionada: ${type.name}. Toque em um lote livre ou arraste até ele.`;
  }

  function renderTiles() {
    ui.tiles.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile';
        tile.dataset.row = String(row);
        tile.dataset.col = String(col);
        tile.setAttribute('role', 'gridcell');
        tile.setAttribute('aria-label', `Lote ${row + 1}, ${col + 1}${occupied(row, col) ? ', ocupado' : ', livre'}`);
        tile.classList.toggle('occupied', occupied(row, col));
        fragment.append(tile);
      }
    }
    ui.tiles.append(fragment);
  }

  function getVisibleBuildings() {
    const query = ui.search.value.trim().toLocaleLowerCase('pt-BR');
    const type = ui.filter.value;
    const result = city.buildings.filter((item) => {
      const typeInfo = typeFor(item.type);
      const text = `${item.name} ${item.notes || ''} ${typeInfo.name} ${item.status || ''}`.toLocaleLowerCase('pt-BR');
      return (type === 'all' || item.type === type) && (!query || text.includes(query));
    });
    const sort = ui.sort.value;
    result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      if (sort === 'type') return typeFor(a.type).name.localeCompare(typeFor(b.type).name, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR');
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }

  function renderBuildingCard(item) {
    const type = typeFor(item.type);
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'building-row';
    button.dataset.id = item.id;
    button.setAttribute('aria-label', `${item.name}, ${type.name}, lote ${item.row + 1}, ${item.col + 1}. Abrir detalhes.`);
    const icon = document.createElement('span');
    icon.className = `art mini ${type.color}`;
    icon.textContent = type.icon;
    const info = document.createElement('span');
    info.className = 'building-row-info';
    const name = document.createElement('b'); name.textContent = item.name;
    const meta = document.createElement('small'); meta.textContent = `${type.name} · Lote ${item.row + 1}, ${item.col + 1}`;
    info.append(name, meta);
    const status = document.createElement('span');
    status.className = `status-dot status-${item.status || 'planned'}`;
    status.setAttribute('aria-label', statusLabel(item.status));
    button.append(icon, info, status);
    listItem.append(button);
    return listItem;
  }

  function statusLabel(status) {
    if (status === 'ready') return 'Concluída';
    if (status === 'building') return 'Em construção';
    return 'Planejada';
  }

  function renderBuildings() {
    const visible = getVisibleBuildings();
    ui.list.replaceChildren();
    ui.buildings.replaceChildren();
    const listFragment = document.createDocumentFragment();
    const mapFragment = document.createDocumentFragment();
    visible.forEach((item) => {
      listFragment.append(renderBuildingCard(item));
      const type = typeFor(item.type);
      const placed = document.createElement('button');
      placed.type = 'button';
      placed.className = `placed placed-${type.color}`;
      placed.dataset.id = item.id;
      placed.draggable = true;
      placed.style.left = `${((item.col + 0.5) / COLS) * 100}%`;
      placed.style.top = `${((item.row + 0.5) / ROWS) * 100}%`;
      placed.setAttribute('aria-label', `${item.name}, ${type.name}, lote ${item.row + 1}, ${item.col + 1}. Toque para ver os detalhes ou arraste para mover.`);
      const icon = document.createElement('span');
      icon.className = 'placed-icon'; icon.textContent = type.icon;
      const label = document.createElement('span');
      label.className = 'placed-label'; label.textContent = item.name;
      placed.append(icon, label);
      mapFragment.append(placed);
    });
    ui.list.append(listFragment);
    ui.buildings.append(mapFragment);
    const total = city.buildings.length;
    ui.count.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
    ui.mapCount.textContent = String(total);
    ui.emptyList.hidden = visible.length > 0;
    renderTiles();
  }

  function selectType(type) {
    if (!typeFor(type)) return;
    selectedType = type;
    removeMode = false;
    ui.removeMode.setAttribute('aria-pressed', 'false');
    ui.removeMode.classList.remove('active');
    updateSelectedPiece();
    const info = typeFor(type);
    announce(`${info.name} selecionada. Toque em um lote livre para colocá-la.`);
    closeMenu();
  }

  function placeBuilding(type, row, col) {
    if (!typeFor(type) || !Number.isInteger(row) || !Number.isInteger(col)) return;
    if (occupied(row, col)) {
      announce('Esse lote já está ocupado. Escolha um espaço livre ou arraste uma construção para movê-la.');
      return;
    }
    const existingCount = city.buildings.filter((item) => item.type === type).length;
    const item = {
      id: makeId(), type, row, col,
      name: `${typeFor(type).name} ${existingCount + 1}`,
      notes: '', status: 'planned', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    city.buildings.push(item);
    persist();
    renderBuildings();
    announce(`${item.name} adicionada ao lote ${row + 1}, ${col + 1}. Toque nela para ver ou editar os detalhes.`);
  }

  function moveBuilding(id, row, col) {
    const item = city.buildings.find((entry) => entry.id === id);
    if (!item) return;
    if (occupied(row, col, id)) {
      announce('Esse lote já está ocupado. A construção não foi movida.');
      return;
    }
    item.row = row; item.col = col; item.updatedAt = new Date().toISOString();
    persist(); renderBuildings();
    announce(`${item.name} movida para o lote ${row + 1}, ${col + 1}.`);
  }

  function openDetails(id) {
    const item = city.buildings.find((entry) => entry.id === id);
    if (!item) return;
    selectedBuildingId = id;
    const type = typeFor(item.type);
    ui.dialog.querySelector('#dialogTitle').textContent = `${type.icon} ${item.name}`;
    ui.location.textContent = `${type.name} · Lote ${item.row + 1}, ${item.col + 1}`;
    ui.name.value = item.name;
    ui.status.value = item.status || 'planned';
    ui.notes.value = item.notes || '';
    ui.dialog.showModal();
  }

  function closeDetails() {
    if (ui.dialog.open) ui.dialog.close();
    selectedBuildingId = null;
  }

  function deleteBuilding(id) {
    const item = city.buildings.find((entry) => entry.id === id);
    if (!item) return;
    city.buildings = city.buildings.filter((entry) => entry.id !== id);
    closeDetails(); persist(); renderBuildings();
    announce(`${item.name} foi removida da cidade.`);
  }

  function saveBuilding(event) {
    event.preventDefault();
    const item = city.buildings.find((entry) => entry.id === selectedBuildingId);
    const name = escapeLabel(ui.name.value);
    if (!item || !name) { ui.name.setCustomValidity('Informe um nome para a construção.'); ui.name.reportValidity(); return; }
    ui.name.setCustomValidity('');
    item.name = name.slice(0, 40);
    item.status = ui.status.value;
    item.notes = ui.notes.value.trim().slice(0, 240);
    item.updatedAt = new Date().toISOString();
    persist(); renderBuildings();
    announce(`${item.name} atualizada.`);
    closeDetails();
  }

  function applyDrop(tile, event) {
    event.preventDefault();
    tile.classList.remove('drop-target');
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    const movingId = event.dataTransfer.getData('application/x-dragcit-building') || draggedBuildingId;
    const type = event.dataTransfer.getData('text/plain') || draggedType;
    if (movingId) moveBuilding(movingId, row, col);
    else if (type) placeBuilding(type, row, col);
    else placeBuilding(selectedType, row, col);
    draggedBuildingId = null; draggedType = null;
  }

  function setZoom(next) {
    zoom = Math.max(0.65, Math.min(1.12, next));
    document.documentElement.style.setProperty('--map-zoom', String(zoom));
    ui.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function closeMenu() {
    ui.sidebar.classList.remove('open'); ui.overlay.classList.remove('show');
  }

  function openMenu() {
    ui.sidebar.classList.add('open'); ui.overlay.classList.add('show');
  }

  async function fetchWeather(event) {
    event.preventDefault();
    const query = ui.cityInput.value.trim();
    if (query.length < 2) { ui.weatherResult.textContent = 'Digite ao menos duas letras.'; return; }
    ui.weatherButton.disabled = true;
    ui.weatherResult.textContent = 'Consultando o clima…';
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`;
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) throw new Error('geocoding');
      const geo = await geoResponse.json();
      const place = geo.results && geo.results[0];
      if (!place) { ui.weatherResult.textContent = 'Não encontrei essa cidade. Confira o nome e tente novamente.'; return; }
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(place.latitude)}&longitude=${encodeURIComponent(place.longitude)}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
      const forecastResponse = await fetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error('forecast');
      const forecast = await forecastResponse.json();
      const current = forecast.current;
      const cityName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
      city.weatherCity = { name: cityName, latitude: place.latitude, longitude: place.longitude, temperature: current.temperature_2m, precipitation: current.precipitation, windSpeed: current.wind_speed_10m, weatherCode: current.weather_code, checkedAt: new Date().toISOString() };
      persist(false);
      renderWeather();
      announce(`Clima atualizado para ${place.name}.`);
    } catch (error) {
      ui.weatherResult.textContent = 'Não consegui consultar agora. Verifique a conexão e tente novamente.';
    } finally {
      ui.weatherButton.disabled = false;
    }
  }

  function renderWeather() {
    if (!city.weatherCity) return;
    const weather = city.weatherCity;
    const updated = new Date(weather.checkedAt);
    const time = Number.isNaN(updated.getTime()) ? '' : ` · ${updated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    ui.cityInput.value = weather.name.split(',')[0];
    ui.weatherResult.textContent = `${weather.name}: ${weather.temperature} °C · chuva ${weather.precipitation} mm · vento ${weather.windSpeed} km/h${time}`;
  }

  ui.catalog.addEventListener('click', (event) => {
    const button = event.target.closest('.piece');
    if (button) selectType(button.dataset.type);
  });
  ui.catalog.addEventListener('dragstart', (event) => {
    const button = event.target.closest('.piece');
    if (!button || !event.dataTransfer) return;
    draggedType = button.dataset.type;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', draggedType);
  });
  ui.catalog.addEventListener('dragend', () => { draggedType = null; });

  ui.tiles.addEventListener('click', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile) return;
    if (removeMode) { announce('Para excluir, toque na construção e use o botão Excluir nos detalhes.'); return; }
    placeBuilding(selectedType, Number(tile.dataset.row), Number(tile.dataset.col));
  });
  ui.tiles.addEventListener('dragover', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile) return;
    event.preventDefault(); tile.classList.add('drop-target');
  });
  ui.tiles.addEventListener('dragleave', (event) => {
    const tile = event.target.closest('.tile');
    if (tile && !tile.contains(event.relatedTarget)) tile.classList.remove('drop-target');
  });
  ui.tiles.addEventListener('drop', (event) => {
    const tile = event.target.closest('.tile');
    if (tile) applyDrop(tile, event);
  });

  ui.buildings.addEventListener('click', (event) => {
    const placed = event.target.closest('.placed');
    if (!placed) return;
    if (removeMode) { openDetails(placed.dataset.id); return; }
    openDetails(placed.dataset.id);
  });
  ui.buildings.addEventListener('dragstart', (event) => {
    const placed = event.target.closest('.placed');
    if (!placed || !event.dataTransfer) return;
    draggedBuildingId = placed.dataset.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-dragcit-building', draggedBuildingId);
  });
  ui.buildings.addEventListener('dragend', () => { draggedBuildingId = null; });
  ui.list.addEventListener('click', (event) => {
    const button = event.target.closest('.building-row');
    if (button) openDetails(button.dataset.id);
  });
  ui.search.addEventListener('input', renderBuildings);
  ui.filter.addEventListener('change', renderBuildings);
  ui.sort.addEventListener('change', renderBuildings);
  ui.form.addEventListener('submit', saveBuilding);
  ui.name.addEventListener('input', () => ui.name.setCustomValidity(''));
  byId('closeDialog').addEventListener('click', closeDetails);
  byId('deleteBuilding').addEventListener('click', () => {
    if (selectedBuildingId) deleteBuilding(selectedBuildingId);
  });
  ui.dialog.addEventListener('click', (event) => {
    if (event.target === ui.dialog) closeDetails();
  });
  ui.removeMode.addEventListener('click', () => {
    removeMode = !removeMode;
    ui.removeMode.setAttribute('aria-pressed', String(removeMode));
    ui.removeMode.classList.toggle('active', removeMode);
    updateSelectedPiece();
    announce(removeMode ? 'Modo de remoção ativo. Abra uma construção e use Excluir para confirmar.' : 'Modo de construção ativo.');
  });
  byId('save').addEventListener('click', () => {
    if (persist()) announce('Sua cidade foi salva neste navegador.');
  });
  byId('clear').addEventListener('click', () => {
    if (city.buildings.length === 0) { announce('A cidade já está vazia.'); return; }
    if (!window.confirm('Limpar todas as construções desta cidade? Essa ação não pode ser desfeita.')) return;
    city.buildings = [];
    persist(); renderBuildings(); announce('Cidade limpa. Você pode começar uma nova construção.');
  });
  byId('openMenu').addEventListener('click', openMenu);
  byId('closeMenu').addEventListener('click', closeMenu);
  ui.overlay.addEventListener('click', closeMenu);
  byId('zoomIn').addEventListener('click', () => setZoom(zoom + 0.08));
  byId('zoomOut').addEventListener('click', () => setZoom(zoom - 0.08));
  byId('resetZoom').addEventListener('click', () => setZoom(0.86));
  byId('weatherForm').addEventListener('submit', fetchWeather);

  renderCatalog();
  renderBuildings();
  setZoom(zoom);
  renderWeather();
})();
