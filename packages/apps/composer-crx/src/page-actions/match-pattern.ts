//
// Copyright 2026 DXOS.org
//

/**
 * Chrome extension match-pattern evaluation
 * (https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns).
 * Supports `<all_urls>`, scheme `*` (http/https), host `*` / `*.domain`, and
 * path globs. Used to gate page actions by URL, both in the background and
 * the popup. Invalid patterns or URLs never match.
 */

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const globToRegExp = (glob: string): RegExp => new RegExp(`^${glob.split('*').map(escapeRegExp).join('.*')}$`);

const matchesPattern = (url: URL, pattern: string): boolean => {
  if (pattern === '<all_urls>') {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }
  const parsed = /^(\*|https?):\/\/(\*|(?:\*\.)?[^/*]+)(\/.*)$/.exec(pattern);
  if (!parsed) {
    return false;
  }
  const [, scheme, host, path] = parsed;

  const protocol = url.protocol.replace(/:$/, '');
  if (scheme === '*' ? !(protocol === 'http' || protocol === 'https') : protocol !== scheme) {
    return false;
  }

  if (host === '*') {
    // Any host.
  } else if (host.startsWith('*.')) {
    const suffix = host.slice(2);
    if (url.hostname !== suffix && !url.hostname.endsWith(`.${suffix}`)) {
      return false;
    }
  } else if (url.hostname !== host) {
    return false;
  }

  return globToRegExp(path).test(url.pathname + url.search);
};

/**
 * Whether the URL matches at least one of the patterns.
 */
export const matchesUrlPatterns = (url: string, patterns: readonly string[]): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return patterns.some((pattern) => matchesPattern(parsed, pattern));
};
