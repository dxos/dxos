import type { PRWithDetails } from '../types';

const GITHUB_TOKEN_KEY = 'pr-dashboard-github-token';
const SETTINGS_KEY = 'pr-dashboard-settings';
const KEEP_CLEAN_KEY = 'pr-dashboard-keep-clean';
const PR_CACHE_KEY = 'pr-dashboard-pr-cache';
const PR_CACHE_TIMESTAMP_KEY = 'pr-dashboard-pr-cache-timestamp';

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

export interface CachedPRData {
  prs: PRWithDetails[];
  timestamp: number;
}

export const getCachedPRs = (): CachedPRData | null => {
  const stored = localStorage.getItem(PR_CACHE_KEY);
  const timestamp = localStorage.getItem(PR_CACHE_TIMESTAMP_KEY);
  if (!stored || !timestamp) return null;
  try {
    return {
      prs: JSON.parse(stored),
      timestamp: Number(timestamp),
    };
  } catch {
    return null;
  }
};

export const setCachedPRs = (prs: PRWithDetails[]): void => {
  localStorage.setItem(PR_CACHE_KEY, JSON.stringify(prs));
  localStorage.setItem(PR_CACHE_TIMESTAMP_KEY, String(Date.now()));
};

export const clearCachedPRs = (): void => {
  localStorage.removeItem(PR_CACHE_KEY);
  localStorage.removeItem(PR_CACHE_TIMESTAMP_KEY);
};
