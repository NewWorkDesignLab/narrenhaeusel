interface MarkerEntry {
  markerName: string;
  markerUrl: string;
  markerWidth: number;
  contentName: string;
  description: string;
  coordinates: string;
  offset: { x: number; y: number; z: number };
  prefabName: string;
}

interface DataFormat {
  items: MarkerEntry[];
}

function getEntryId(entry: MarkerEntry): string {
  return entry.markerName || '';
}

function getEntryName(entry: MarkerEntry): string {
  return entry.contentName || '';
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
const editNameInput = document.getElementById('edit-name') as HTMLInputElement;
const editDescriptionInput = document.getElementById('edit-description') as HTMLTextAreaElement;
const editModelPathInput = document.getElementById('edit-modelPath') as HTMLInputElement;
const editLatitudeInput = document.getElementById('edit-latitude') as HTMLInputElement;
const editLongitudeInput = document.getElementById('edit-longitude') as HTMLInputElement;

const editMarkerNameInput = document.getElementById('edit-markerName') as HTMLInputElement;
const editMarkerUrlInput = document.getElementById('edit-markerUrl') as HTMLInputElement;
const editMarkerWidthInput = document.getElementById('edit-markerWidth') as HTMLInputElement;
const editOffsetXInput = document.getElementById('edit-offsetX') as HTMLInputElement;
const editOffsetYInput = document.getElementById('edit-offsetY') as HTMLInputElement;
const editOffsetZInput = document.getElementById('edit-offsetZ') as HTMLInputElement;

const markerPreview = document.getElementById('marker-preview') as HTMLElement;
const markerFileInput = document.getElementById('marker-file') as HTMLInputElement;
const markerUploadBtn = document.getElementById('marker-upload-btn') as HTMLButtonElement;
const markerDeleteBtn = document.getElementById('marker-delete-btn') as HTMLButtonElement;

let apiKey = '';
let entries: MarkerEntry[] = [];
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
      if (data.apiKey) {
        apiKey = data.apiKey;
        return true;
      } else {
        return false;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function loadData(): Promise<void> {
  loading.classList.remove('hidden');
  editorContent.classList.add('hidden');
  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    const data: DataFormat = await response.json();
    if (data && Array.isArray(data.items)) {
      entries = data.items;
    } else {
      entries = [];
    }
    loading.classList.add('hidden');
    editorContent.classList.remove('hidden');
    renderEntries();
  } catch (error) {
    loading.textContent = 'Error loading data: ' + (error as Error).message;
  }
}

function renderEntries(): void {
  entriesGrid.innerHTML = '';

  const addCard = document.createElement('div');
  addCard.className = 'entry-card add-new-card';
  addCard.innerHTML = `
    <div class="add-new-content">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add New Entry</span>
    </div>
  `;
  addCard.addEventListener('click', createNewEntry);
  entriesGrid.appendChild(addCard);

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

function createNewEntry(): void {
  const newId = `marker_${Date.now()}`;
  const newEntry: MarkerEntry = {
    markerName: newId,
    markerUrl: '',
    markerWidth: 0.2,
    contentName: 'New Entry',
    description: '',
    coordinates: '0,0',
    offset: { x: 0, y: 0, z: 0 },
    prefabName: '',
  };

  entries.push(newEntry);
  renderEntries();

  openEditModal(newId);
}

function openEditModal(id: string): void {
  const entry = entries.find((e) => getEntryId(e) === id);
  if (!entry) return;
  currentEditId = id;

  editMarkerNameInput.value = entry.markerName || '';
  editMarkerUrlInput.value = entry.markerUrl || '';
  editMarkerWidthInput.value = String(entry.markerWidth || 0.2);
  editNameInput.value = entry.contentName || '';
  editDescriptionInput.value = entry.description || '';
  editModelPathInput.value = entry.prefabName || '';

  const coords = entry.coordinates || '';
  const parts = coords.split(',').map(s => s.trim());
  editLatitudeInput.value = parts[0] || '';
  editLongitudeInput.value = parts[1] || '';

  const offset = entry.offset || { x: 0, y: 0, z: 0 };
  editOffsetXInput.value = String(offset.x);
  editOffsetYInput.value = String(offset.y);
  editOffsetZInput.value = String(offset.z);


  editMarkerUrlInput.value = entry.markerUrl || '';
  updateMarkerPreview(entry.markerUrl || '');

  editModal.classList.remove('hidden');
}

function closeEditModal(): void {
  editModal.classList.add('hidden');
  currentEditId = null;
  editForm.reset();
  updateMarkerPreview('');
}


function updateMarkerPreview(url: string): void {
  if (url) {
    let resolvedUrl = url;

    if (!url.startsWith('data:')) {
      if (url.startsWith('/markers/')) {
        resolvedUrl = `https://00224466.xyz/narrenhaeusel${url}`;
      }
      else if (url.startsWith('/narrenhaeusel/markers/')) {
        resolvedUrl = `https://00224466.xyz${url}`;
      }
    }

    const img = document.createElement('img');
    img.alt = 'Marker preview';
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      markerPreview.innerHTML = '';
      markerPreview.appendChild(img);
    };
    img.onerror = () => {
      markerPreview.innerHTML = '<span class="no-icon">Load failed</span>';
    };
    img.src = resolvedUrl;
  } else {
    markerPreview.innerHTML = '<span class="no-icon">No marker</span>';
  }
}

function applyEditChanges(): void {
  if (!currentEditId) {
    return;
  }

  let entryIndex = entries.findIndex((e) => getEntryId(e) === currentEditId);

  if (entryIndex === -1) {
    entryIndex = entries.findIndex((e) =>
      e.markerName === currentEditId || e.contentName === currentEditId
    );
    if (entryIndex === -1) {
      alert('Entry not found. Please reload and try again.');
      return;
    }
  }

  const markerName = editMarkerNameInput.value.trim();
  const contentName = editNameInput.value.trim();
  const latitude = editLatitudeInput.value.trim();
  const longitude = editLongitudeInput.value.trim();

  if (!markerName) {
    alert('Marker Name is required');
    editMarkerNameInput.focus();
    return;
  }
  if (!contentName) {
    alert('Content Name is required');
    editNameInput.focus();
    return;
  }
  if (!latitude || !longitude) {
    alert('Latitude and Longitude are required');
    return;
  }

  const original = entries[entryIndex];

  original.markerName = markerName;
  original.markerUrl = editMarkerUrlInput.value || '';
  original.markerWidth = parseFloat(editMarkerWidthInput.value) || 0.2;
  original.contentName = contentName;
  original.description = editDescriptionInput.value || '';
  original.prefabName = editModelPathInput.value || '';
  original.coordinates = `${latitude},${longitude}`;
  original.offset = {
    x: parseFloat(editOffsetXInput.value) || 0,
    y: parseFloat(editOffsetYInput.value) || 0,
    z: parseFloat(editOffsetZInput.value) || 0,
  };

  entries[entryIndex] = original;
  currentEditId = original.markerName;

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


async function syncFromServer(): Promise<void> {
  saveError.style.display = 'none';
  saveSuccess.style.display = 'none';
  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      cache: 'no-store',
      headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) throw new Error('Failed to sync data');
    const data: DataFormat = await response.json();
    if (data && Array.isArray(data.items)) {
      entries = data.items;
    } else {
      entries = [];
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

  const normalizedEntries: MarkerEntry[] = [];
  for (const entry of entries) {
    if (!entry.markerName) {
      saveError.textContent = `Validation error: Entry is missing markerName`;
      saveError.style.display = 'block';
      return;
    }
    if (!entry.contentName) {
      saveError.textContent = `Validation error: Entry "${entry.markerName}" is missing contentName`;
      saveError.style.display = 'block';
      return;
    }
    if (!entry.coordinates || typeof entry.coordinates !== 'string') {
      saveError.textContent = `Validation error: Entry "${entry.markerName}" is missing coordinates`;
      saveError.style.display = 'block';
      return;
    }

    const normalizedEntry: MarkerEntry = {
      markerName: entry.markerName,
      markerUrl: entry.markerUrl || '',
      markerWidth: typeof entry.markerWidth === 'number' ? entry.markerWidth : (parseFloat(String(entry.markerWidth)) || 0.2),
      contentName: entry.contentName,
      description: entry.description || '',
      coordinates: entry.coordinates,
      offset: {
        x: typeof entry.offset?.x === 'number' ? entry.offset.x : (parseFloat(String(entry.offset?.x)) || 0),
        y: typeof entry.offset?.y === 'number' ? entry.offset.y : (parseFloat(String(entry.offset?.y)) || 0),
        z: typeof entry.offset?.z === 'number' ? entry.offset.z : (parseFloat(String(entry.offset?.z)) || 0),
      },
      prefabName: entry.prefabName || '',
    };
    normalizedEntries.push(normalizedEntry);
  }

  try {
    const dataToSave = { items: normalizedEntries };
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(dataToSave),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Save failed (${response.status})`);
    }
    entries = normalizedEntries;
    saveSuccess.style.display = 'block';
    setTimeout(() => {
      saveSuccess.style.display = 'none';
    }, 3000);
  } catch (error) {
    saveError.textContent = 'Save error: ' + (error as Error).message;
    saveError.style.display = 'block';
  }
}


async function handleMarkerUpload(file: File): Promise<void> {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string;
    updateMarkerPreview(dataUrl);

    try {
      const formData = new FormData();
      formData.append('marker', file);
      formData.append('filename', file.name);

      const response = await fetch(`${API_BASE}/narrenhaeusel/api/upload-marker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const baseUrl = IS_DEV ? '' : 'https://00224466.xyz';
        const fullUrl = `${baseUrl}/narrenhaeusel${result.url}`;
        editMarkerUrlInput.value = fullUrl;
        updateMarkerPreview(fullUrl);
      } else {
        editMarkerUrlInput.value = dataUrl;
      }
    } catch (error) {
      editMarkerUrlInput.value = dataUrl;
    }
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


editClose.addEventListener('click', closeEditModal);
editCancel.addEventListener('click', closeEditModal);
editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  applyEditChanges();
});
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});


editMarkerUrlInput.addEventListener('input', () => {
  updateMarkerPreview(editMarkerUrlInput.value);
});

markerUploadBtn.addEventListener('click', () => markerFileInput.click());
markerFileInput.addEventListener('change', () => {
  if (markerFileInput.files && markerFileInput.files[0]) {
    handleMarkerUpload(markerFileInput.files[0]);
  }
});

markerDeleteBtn.addEventListener('click', () => {
  editMarkerUrlInput.value = '';
  updateMarkerPreview('');
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
