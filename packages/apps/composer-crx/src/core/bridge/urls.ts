//
// Copyright 2026 DXOS.org
//

import { decodeStringArray, defineState } from '../state';

/**
 * Default list of URL patterns (chrome `match` form) the extension will scan
 * when looking for an open Composer tab. Users can override via the options
 * page.
 */
export const DEFAULT_COMPOSER_URLS = [
  'http://localhost:5173/*',
  'http://localhost:4200/*',
  'https://composer.dxos.org/*',
  'https://labs.composer.space/*',
];

/** Configured Composer URL patterns, synced across the user's browsers (defaults to {@link DEFAULT_COMPOSER_URLS}). */
const ComposerUrlsState = defineState('sync', 'composer-urls', DEFAULT_COMPOSER_URLS, decodeStringArray);

export const getComposerUrls = (): Promise<string[]> => ComposerUrlsState.get();

export const setComposerUrls = (urls: string[]): Promise<void> => ComposerUrlsState.set(urls);

/**
 * Test a candidate URL against a single chrome-style match pattern.
 *
 * Supports the subset the extension uses: a `*` (or explicit) scheme, a host
 * that may be `*` (any host) or a leading `*.` wildcard (host + subdomains),
 * an optional explicit port, and a path glob where `*` matches any run of
 * characters. Returns `false` for unparseable candidates rather than throwing.
 */
export const matchesPattern = (pattern: string, candidate: string): boolean => {
  const parsed = parsePattern(pattern);
  if (!parsed) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }

  if (parsed.scheme !== '*' && parsed.scheme !== url.protocol.replace(/:$/, '')) {
    return false;
  }
  if (!hostMatches(parsed.host, url.hostname)) {
    return false;
  }
  if (parsed.port !== undefined && parsed.port !== url.port) {
    return false;
  }
  return new RegExp(parsed.path).test(url.pathname + url.search);
};

/**
 * Whether the candidate URL matches any configured Composer URL pattern.
 */
export const isComposerUrl = async (candidate: string | undefined): Promise<boolean> => {
  if (!candidate) {
    return false;
  }
  const urls = await getComposerUrls();
  return urls.some((pattern) => matchesPattern(pattern, candidate));
};

type ParsedPattern = { scheme: string; host: string; port?: string; path: string };

const parsePattern = (pattern: string): ParsedPattern | undefined => {
  const schemeSplit = pattern.indexOf('://');
  if (schemeSplit < 0) {
    return undefined;
  }
  const scheme = pattern.slice(0, schemeSplit);
  const rest = pattern.slice(schemeSplit + 3);
  const pathSplit = rest.indexOf('/');
  const authority = pathSplit < 0 ? rest : rest.slice(0, pathSplit);
  const pathGlob = pathSplit < 0 ? '/*' : rest.slice(pathSplit);

  const portSplit = authority.lastIndexOf(':');
  const host = portSplit < 0 ? authority : authority.slice(0, portSplit);
  const port = portSplit < 0 ? undefined : authority.slice(portSplit + 1);

  return { scheme, host, port, path: globToRegExp(pathGlob) };
};

const hostMatches = (patternHost: string, host: string): boolean => {
  if (patternHost === '*') {
    return true;
  }
  if (patternHost.startsWith('*.')) {
    const suffix = patternHost.slice(2);
    return host === suffix || host.endsWith('.' + suffix);
  }
  return patternHost === host;
};

const globToRegExp = (glob: string): string =>
  '^' +
  glob
    .split('*')
    .map((segment) => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*') +
  '$';
