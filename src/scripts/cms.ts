interface ModelEntry {
  id?: string;
  name?: string;
  associatedMarker?: string;
  contentName?: string;
  modelPath?: string;
  prefabName?: string;
  coordinates?: {
    latitude: string;
    longitude: string;
  } | string;
  description: string;
  iconUrl?: string;
  offset?: { x: number; y: number; z: number };
}

function getEntryId(entry: ModelEntry): string {
  return entry.id || entry.associatedMarker || '';
}

function getEntryName(entry: ModelEntry): string {
  return entry.name || entry.contentName || '';
}

const IS_DEV = import.meta.env.DEV;
const DEV_SKIP_AUTH = false;
const API_BASE = IS_DEV ? '/proxy' : 'https://00224466.xyz';

const loginContainer = document.getElementById('login-container') as HTMLElement;
const editorContainer = document.getElementById('editor-container') as HTMLElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginError = document.getElementById('login-error') as HTMLElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const loading = document.getElementById('loading') as HTMLElement;
const editorContent = document.getElementById('editor-content') as HTMLElement;
const entriesGrid = document.getElementById('entries-grid') as HTMLElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const addEntryBtn = document.getElementById('add-entry-btn') as HTMLButtonElement;
const saveError = document.getElementById('save-error') as HTMLElement;
const saveSuccess = document.getElementById('save-success') as HTMLElement;

const syncModal = document.getElementById('sync-modal') as HTMLElement;
const syncCancel = document.getElementById('sync-cancel') as HTMLButtonElement;
const syncConfirm = document.getElementById('sync-confirm') as HTMLButtonElement;

const deleteModal = document.getElementById('delete-modal') as HTMLElement;
const deleteEntryName = document.getElementById('delete-entry-name') as HTMLElement;
const deleteCancel = document.getElementById('delete-cancel') as HTMLButtonElement;
const deleteConfirm = document.getElementById('delete-confirm') as HTMLButtonElement;

const editModal = document.getElementById('edit-modal') as HTMLElement;
const editForm = document.getElementById('edit-form') as HTMLFormElement;
const editClose = document.getElementById('edit-close') as HTMLButtonElement;
const editCancel = document.getElementById('edit-cancel') as HTMLButtonElement;
const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
const editNameInput = document.getElementById('edit-name') as HTMLInputElement;
const editDescriptionInput = document.getElementById('edit-description') as HTMLTextAreaElement;
const editModelPathInput = document.getElementById('edit-modelPath') as HTMLInputElement;
const editLatitudeInput = document.getElementById('edit-latitude') as HTMLInputElement;
const editLongitudeInput = document.getElementById('edit-longitude') as HTMLInputElement;
const editIconUrlInput = document.getElementById('edit-iconUrl') as HTMLInputElement;
const iconPreview = document.getElementById('icon-preview') as HTMLElement;
const iconFileInput = document.getElementById('icon-file') as HTMLInputElement;
const iconUploadBtn = document.getElementById('icon-upload-btn') as HTMLButtonElement;
const iconDeleteBtn = document.getElementById('icon-delete-btn') as HTMLButtonElement;

const addModal = document.getElementById('add-modal') as HTMLElement;
const addForm = document.getElementById('add-form') as HTMLFormElement;
const addClose = document.getElementById('add-close') as HTMLButtonElement;
const addCancel = document.getElementById('add-cancel') as HTMLButtonElement;
const addIdInput = document.getElementById('add-id') as HTMLInputElement;
const addNameInput = document.getElementById('add-name') as HTMLInputElement;

let apiKey = '';
let entries: ModelEntry[] = [];
let currentEditId: string | null = null;
let deleteTargetId: string | null = null;

async function verifyPassword(password: string): Promise<boolean> {
  if (IS_DEV && DEV_SKIP_AUTH) {
    apiKey = password;
    return password.length > 0;
  }
  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/cms-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Login response:', data);
      if (data.apiKey) {
        apiKey = data.apiKey;
        return true;
      } else {
        console.error('Login response missing apiKey field');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

async function loadData(): Promise<void> {
  loading.classList.remove('hidden');
  editorContent.classList.add('hidden');
  try {
    console.log('Loading data with apiKey:', apiKey ? 'present' : 'missing');
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Load response error:', response.status, errorText);
      throw new Error(`Failed to load data: ${response.status}`);
    }
    const data = await response.json();
    console.log('Loaded data type:', typeof data, Array.isArray(data) ? 'array' : 'object');
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && Array.isArray(data.items)) {
      entries = data.items;
    } else {
      entries = [];
      console.warn('Unexpected data format:', data);
    }
    console.log('Entries count:', entries.length);
    loading.classList.add('hidden');
    editorContent.classList.remove('hidden');
    renderEntries();
  } catch (error) {
    loading.textContent = 'Error loading data: ' + (error as Error).message;
    console.error('Load error:', error);
  }
}

function renderEntries(): void {
  entriesGrid.innerHTML = '';
  entries.forEach((entry) => {
    const entryId = getEntryId(entry);
    const entryName = getEntryName(entry);
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.id = entryId;
    card.innerHTML = `
      <div class="entry-info">
        <div class="entry-name">${entryName || 'Unnamed'}</div>
        <div class="entry-id">${entryId || 'No ID'}</div>
      </div>
      <div class="entry-actions">
        <button class="entry-btn edit-btn" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="entry-btn delete-btn" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;
    const editBtn = card.querySelector('.edit-btn') as HTMLButtonElement;
    const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
    editBtn.addEventListener('click', () => openEditModal(entryId));
    deleteBtn.addEventListener('click', () => openDeleteModal(entryId));
    entriesGrid.appendChild(card);
  });
}

function openEditModal(id: string): void {
  const entry = entries.find((e) => getEntryId(e) === id);
  if (!entry) return;
  currentEditId = id;
  editIdInput.value = getEntryId(entry);
  editNameInput.value = getEntryName(entry);
  editDescriptionInput.value = entry.description || '';
  editModelPathInput.value = entry.modelPath || entry.prefabName || '';
  const coords = entry.coordinates;
  if (typeof coords === 'string') {
    const parts = coords.split(',').map(s => s.trim());
    editLatitudeInput.value = parts[0] || '';
    editLongitudeInput.value = parts[1] || '';
  } else if (coords) {
    editLatitudeInput.value = coords.latitude || '';
    editLongitudeInput.value = coords.longitude || '';
  } else {
    editLatitudeInput.value = '';
    editLongitudeInput.value = '';
  }
  editIconUrlInput.value = entry.iconUrl || '';
  updateIconPreview(entry.iconUrl || '');
  editModal.classList.remove('hidden');
}

function closeEditModal(): void {
  editModal.classList.add('hidden');
  currentEditId = null;
  editForm.reset();
  updateIconPreview('');
}

function updateIconPreview(url: string): void {
  if (url) {
    iconPreview.innerHTML = `<img src="${url}" alt="Icon preview" />`;
  } else {
    iconPreview.innerHTML = '<span class="no-icon">No icon</span>';
  }
}

function applyEditChanges(): void {
  if (!currentEditId) return;
  const entryIndex = entries.findIndex((e) => getEntryId(e) === currentEditId);
  if (entryIndex === -1) return;
  const original = entries[entryIndex];
  if (original.contentName !== undefined) {
    original.contentName = editNameInput.value;
  } else {
    original.name = editNameInput.value;
  }
  original.description = editDescriptionInput.value;
  if (original.prefabName !== undefined) {
    original.prefabName = editModelPathInput.value;
  } else {
    original.modelPath = editModelPathInput.value;
  }
  if (typeof original.coordinates === 'string') {
    original.coordinates = `${editLatitudeInput.value}, ${editLongitudeInput.value}`;
  } else {
    original.coordinates = {
      latitude: editLatitudeInput.value,
      longitude: editLongitudeInput.value,
    };
  }
  original.iconUrl = editIconUrlInput.value || undefined;
  entries[entryIndex] = original;
  renderEntries();
  closeEditModal();
}

function openDeleteModal(id: string): void {
  const entry = entries.find((e) => getEntryId(e) === id);
  if (!entry) return;
  deleteTargetId = id;
  deleteEntryName.textContent = getEntryName(entry);
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal(): void {
  deleteModal.classList.add('hidden');
  deleteTargetId = null;
}

function confirmDelete(): void {
  if (!deleteTargetId) return;
  entries = entries.filter((e) => getEntryId(e) !== deleteTargetId);
  renderEntries();
  closeDeleteModal();
}

function openAddModal(): void {
  addIdInput.value = '';
  addNameInput.value = '';
  addModal.classList.remove('hidden');
}

function closeAddModal(): void {
  addModal.classList.add('hidden');
  addForm.reset();
}

function addNewEntry(): void {
  const id = addIdInput.value.trim().toLowerCase();
  const name = addNameInput.value.trim();
  if (!id || !name) return;
  if (entries.some((e) => getEntryId(e) === id)) {
    alert('An entry with this ID already exists.');
    return;
  }
  const newEntry: ModelEntry = {
    associatedMarker: id,
    contentName: name,
    prefabName: '',
    coordinates: '',
    description: '',
  };
  entries.push(newEntry);
  renderEntries();
  closeAddModal();
  openEditModal(id);
}

async function syncFromServer(): Promise<void> {
  saveError.style.display = 'none';
  saveSuccess.style.display = 'none';
  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      cache: 'no-store',
      headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) throw new Error('Failed to sync data');
    const data = await response.json();
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && Array.isArray(data.items)) {
      entries = data.items;
    } else {
      entries = [];
      console.warn('Unexpected data format:', data);
    }
    renderEntries();
    saveSuccess.textContent = 'Data synced from server!';
    saveSuccess.style.display = 'block';
    setTimeout(() => {
      saveSuccess.style.display = 'none';
      saveSuccess.textContent = 'Data saved successfully!';
    }, 3000);
  } catch (error) {
    saveError.textContent = 'Sync error: ' + (error as Error).message;
    saveError.style.display = 'block';
  }
}

async function saveData(): Promise<void> {
  saveError.style.display = 'none';
  saveSuccess.style.display = 'none';
  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(entries),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Save failed');
    }
    saveSuccess.style.display = 'block';
    setTimeout(() => {
      saveSuccess.style.display = 'none';
    }, 3000);
  } catch (error) {
    saveError.textContent = 'Save error: ' + (error as Error).message;
    saveError.style.display = 'block';
  }
}

function handleIconUpload(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    editIconUrlInput.value = dataUrl;
    updateIconPreview(dataUrl);
  };
  reader.readAsDataURL(file);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const password = passwordInput.value;
  const isValid = await verifyPassword(password);
  if (isValid) {
    loginContainer.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    loadData();
  } else {
    loginError.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();
  }
});

saveBtn.addEventListener('click', saveData);
reloadBtn.addEventListener('click', () => {
  saveError.style.display = 'none';
  saveSuccess.style.display = 'none';
  loadData();
});

syncBtn.addEventListener('click', () => syncModal.classList.remove('hidden'));
syncCancel.addEventListener('click', () => syncModal.classList.add('hidden'));
syncConfirm.addEventListener('click', () => {
  syncModal.classList.add('hidden');
  syncFromServer();
});
syncModal.addEventListener('click', (e) => {
  if (e.target === syncModal) syncModal.classList.add('hidden');
});

addEntryBtn.addEventListener('click', openAddModal);
addClose.addEventListener('click', closeAddModal);
addCancel.addEventListener('click', closeAddModal);
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addNewEntry();
});
addModal.addEventListener('click', (e) => {
  if (e.target === addModal) closeAddModal();
});

editClose.addEventListener('click', closeEditModal);
editCancel.addEventListener('click', closeEditModal);
editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  applyEditChanges();
});
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

editIconUrlInput.addEventListener('input', () => {
  updateIconPreview(editIconUrlInput.value);
});

iconUploadBtn.addEventListener('click', () => iconFileInput.click());
iconFileInput.addEventListener('change', () => {
  if (iconFileInput.files && iconFileInput.files[0]) {
    handleIconUpload(iconFileInput.files[0]);
  }
});

iconDeleteBtn.addEventListener('click', () => {
  editIconUrlInput.value = '';
  updateIconPreview('');
});

deleteCancel.addEventListener('click', closeDeleteModal);
deleteConfirm.addEventListener('click', confirmDelete);
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

logoutBtn.addEventListener('click', () => {
  apiKey = '';
  entries = [];
  passwordInput.value = '';
  entriesGrid.innerHTML = '';
  editorContainer.classList.add('hidden');
  loginContainer.classList.remove('hidden');
});
