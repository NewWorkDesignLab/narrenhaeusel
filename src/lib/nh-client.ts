const BASE = '/api';

async function request<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface LoginResponse {
  apiKey?: string;
}

export interface DataFormat {
  items: unknown[];
}

export const nh = {
  login: (password: string): Promise<LoginResponse> =>
    request<LoginResponse>('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),

  getData: (apiKey: string): Promise<DataFormat> =>
    request<DataFormat>('/get-data', {
      headers: { 'X-API-Key': apiKey },
    }),

  saveData: (data: DataFormat, apiKey: string): Promise<unknown> =>
    request('/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    }),

  uploadMarker: (formData: FormData, apiKey: string): Promise<{ url: string }> =>
    request<{ url: string }>('/upload-marker', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    }),
};
