//
// Copyright 2026 DXOS.org
//

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

/** A predicate true when a path matches any of `patterns`, compiled once for the caller to reuse. */
export const globMatcher = (patterns: readonly string[]): ((path: string) => boolean) => {
  const regexes = patterns.map(compile);
  return (path) => regexes.some((regex) => regex.test(path));
};

/** True when `path` matches any of `patterns`. */
export const matchesAny = (patterns: readonly string[], path: string): boolean => globMatcher(patterns)(path);
