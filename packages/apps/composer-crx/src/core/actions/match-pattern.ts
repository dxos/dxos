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

/**
 * Linear-time glob match (`*` wildcards only). A backtracking regex here is a
 * ReDoS hazard: patterns come from untrusted descriptors and inputs from
 * arbitrary page URLs, so matching must not be super-linear.
 */
const globMatches = (glob: string, input: string): boolean => {
  let globIdx = 0;
  let inputIdx = 0;
  let starIdx = -1;
  let backtrackIdx = 0;
  while (inputIdx < input.length) {
    if (globIdx < glob.length && glob[globIdx] === input[inputIdx]) {
      globIdx++;
      inputIdx++;
    } else if (globIdx < glob.length && glob[globIdx] === '*') {
      starIdx = globIdx++;
      backtrackIdx = inputIdx;
    } else if (starIdx >= 0) {
      globIdx = starIdx + 1;
      inputIdx = ++backtrackIdx;
    } else {
      return false;
    }
  }
  while (globIdx < glob.length && glob[globIdx] === '*') {
    globIdx++;
  }
  return globIdx === glob.length;
};

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

  // Lowercase the pattern host before comparing: Chrome is case-insensitive,
  // and URL.hostname is already lowercase.
  const hostLower = host.toLowerCase();
  if (hostLower === '*') {
    // Any host.
  } else if (hostLower.startsWith('*.')) {
    const suffix = hostLower.slice(2);
    if (url.hostname !== suffix && !url.hostname.endsWith(`.${suffix}`)) {
      return false;
    }
  } else if (url.hostname !== hostLower) {
    return false;
  }

  return globMatches(path, url.pathname + url.search);
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
