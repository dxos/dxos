//
// Copyright 2026 DXOS.org
//

const cache = new Map<string, RegExp>();

/**
 * Compiles a repository-relative glob: `**` spans directories (`**` + `/` also matches none), `*` and
 * `?` stay within one, everything else is literal.
 */
const compile = (pattern: string): RegExp => {
  let source = '';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      if (pattern[index + 2] === '/') {
        source += '(?:.*/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
};

/** True when `path` matches any of `patterns`. */
export const matchesAny = (patterns: readonly string[], path: string): boolean =>
  patterns.some((pattern) => {
    let regex = cache.get(pattern);
    if (!regex) {
      regex = compile(pattern);
      cache.set(pattern, regex);
    }
    return regex.test(path);
  });
