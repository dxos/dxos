const GITHUB_TOKEN_KEY = 'pr-dashboard-github-token';
const SETTINGS_KEY = 'pr-dashboard-settings';
const KEEP_CLEAN_KEY = 'pr-dashboard-keep-clean';

export const getGitHubToken = (): string | null => {
  return localStorage.getItem(GITHUB_TOKEN_KEY);
};

export const setGitHubToken = (token: string): void => {
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
};

export const clearGitHubToken = (): void => {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
};

export interface StoredSettings {
  owner: string;
  repo: string;
  anthropicApiKey: string;
  refreshInterval: number;
}

export const getSettings = (): StoredSettings | null => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setSettings = (settings: StoredSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getKeepCleanPRs = (): Set<number> => {
  const stored = localStorage.getItem(KEEP_CLEAN_KEY);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
};

export const setKeepCleanPRs = (prNumbers: Set<number>): void => {
  localStorage.setItem(KEEP_CLEAN_KEY, JSON.stringify([...prNumbers]));
};
