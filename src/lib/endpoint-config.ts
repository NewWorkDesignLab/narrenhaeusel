import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

interface EndpointConfig {
  api: {
    base_url: string;
    prefix: string;
  };
}

let cachedUrl: string | null = null;

export function getApiUrl(): string {
  if (cachedUrl) return cachedUrl;
  const filePath = path.resolve(process.cwd(), 'endpoints.yaml');
  const config = yaml.load(fs.readFileSync(filePath, 'utf8')) as EndpointConfig;
  cachedUrl = `${config.api.base_url}${config.api.prefix}`;
  return cachedUrl;
}

