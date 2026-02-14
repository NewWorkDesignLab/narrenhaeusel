import { EditorView, basicSetup } from 'codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';

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
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const saveError = document.getElementById('save-error') as HTMLElement;
const saveSuccess = document.getElementById('save-success') as HTMLElement;
const editorWrapper = document.getElementById('editor-wrapper') as HTMLElement;
const jsonErrorBar = document.getElementById('json-error-bar') as HTMLElement;
const jsonErrorText = document.getElementById('json-error-text') as HTMLElement;
const syncModal = document.getElementById('sync-modal') as HTMLElement;
const syncCancel = document.getElementById('sync-cancel') as HTMLButtonElement;
const syncConfirm = document.getElementById('sync-confirm') as HTMLButtonElement;

let currentPassword = '';
let apiKey = '';
let editorView: EditorView | null = null;

function initEditor(content: string): void {
  const container = document.getElementById('json-editor-container');
  if (!container) return;

  if (editorView) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: content },
    });
    return;
  }

  editorView = new EditorView({
    doc: content,
    extensions: [
      basicSetup,
      json(),
      lintGutter(),
      linter(jsonParseLinter()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          validateJson();
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          backgroundColor: '#fafafa',
        },
        '.cm-content': {
          fontFamily: "'Consolas', 'Monaco', monospace",
          padding: '16px 0',
        },
        '.cm-gutters': {
          backgroundColor: '#f5f5f5',
          borderRight: '1px solid #e0e0e0',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 178, 0, 0.08)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(255, 178, 0, 0.15)',
        },
        '&.cm-focused': {
          outline: 'none',
        },
      }),
    ],
    parent: container,
  });

  validateJson();
}

function validateJson(): boolean {
  if (!editorView) return false;

  const content = editorView.state.doc.toString();

  try {
    JSON.parse(content);
    editorWrapper.classList.remove('has-error');
    jsonErrorBar.classList.remove('visible');
    return true;
  } catch (e) {
    const error = e as SyntaxError;
    const match = error.message.match(/position (\d+)/);
    let line = 1;

    if (match) {
      const position = parseInt(match[1], 10);
      const textUntilError = content.substring(0, position);
      line = (textUntilError.match(/\n/g) || []).length + 1;
    }

    editorWrapper.classList.add('has-error');
    jsonErrorBar.classList.add('visible');
    jsonErrorText.textContent = `Line ${line}: ${error.message}`;
    return false;
  }
}

async function verifyPassword(password: string): Promise<boolean> {
  if (IS_DEV && DEV_SKIP_AUTH) {
    apiKey = password;
    return password.length > 0;
  }

  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/cms-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      const data = await response.json();
      apiKey = data.apiKey;
      return true;
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
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    const data = await response.json();
    const content = JSON.stringify(data, null, 2);

    loading.classList.add('hidden');
    editorContent.classList.remove('hidden');

    initEditor(content);
  } catch (error) {
    loading.textContent = 'Error loading data: ' + (error as Error).message;
  }
}

async function syncFromServer(): Promise<void> {
  saveError.style.display = 'none';
  saveSuccess.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/get-data`, {
      cache: 'no-store',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to sync data');
    }
    const data = await response.json();
    const content = JSON.stringify(data, null, 2);

    if (editorView) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: content },
      });
    }

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

  if (!editorView) return;

  if (!validateJson()) {
    saveError.textContent = 'Please fix JSON errors first';
    saveError.style.display = 'block';
    return;
  }

  const jsonData = JSON.parse(editorView.state.doc.toString());

  try {
    const response = await fetch(`${API_BASE}/narrenhaeusel/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(jsonData),
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

function showSyncModal(): void {
  syncModal.classList.remove('hidden');
}

function hideSyncModal(): void {
  syncModal.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';

  const password = passwordInput.value;
  const isValid = await verifyPassword(password);

  if (isValid) {
    currentPassword = password;
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

syncBtn.addEventListener('click', showSyncModal);

syncCancel.addEventListener('click', hideSyncModal);

syncConfirm.addEventListener('click', () => {
  hideSyncModal();
  syncFromServer();
});

syncModal.addEventListener('click', (e) => {
  if (e.target === syncModal) {
    hideSyncModal();
  }
});

logoutBtn.addEventListener('click', () => {
  currentPassword = '';
  passwordInput.value = '';
  if (editorView) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: '' },
    });
  }
  editorContainer.classList.add('hidden');
  loginContainer.classList.remove('hidden');
});

