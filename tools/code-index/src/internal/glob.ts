//
// Copyright 2026 DXOS.org
//

/**
 * Compiles a path glob to an anchored regular expression the rule engine's `regex` accepts: a `**`
 * segment spans any number of directories, `*` and `?` stay within one segment, and `{a,b}` is an
 * alternative. Everything else is literal.
 */
export const globPattern = (glob: string): string => {
  let pattern = '';
  let depth = 0;
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (glob.startsWith('**/', index)) {
      pattern += '(?:.*/)?';
      index += 2;
    } else if (glob.startsWith('**', index)) {
      pattern += '.*';
      index += 1;
    } else if (char === '*') {
      pattern += '[^/]*';
    } else if (char === '?') {
      pattern += '[^/]';
    } else if (char === '{') {
      pattern += '(?:';
      depth++;
    } else if (char === '}' && depth > 0) {
      pattern += ')';
      depth--;
    } else if (char === ',' && depth > 0) {
      pattern += '|';
    } else {
      pattern += /[.+()^$|[\]{}\\]/.test(char) ? `\\${char}` : char;
    }
  }
  return `^${pattern}${')'.repeat(depth)}$`;
};
