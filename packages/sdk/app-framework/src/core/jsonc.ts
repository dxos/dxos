//
// Copyright 2026 DXOS.org
//

/**
 * Strips comments and trailing commas so `JSON.parse` accepts JSONC. Scans character by character
 * rather than matching a regex over the whole text, because a `//` or `/*` inside a string literal
 * — plugin descriptions carry URLs — is content, not a comment.
 */
export const parseJsonc = (text: string): unknown => {
  let out = '';
  let index = 0;
  // Tracked during the scan rather than stripped afterwards, because a copied string literal can
  // itself contain `, }`.
  let pendingComma: number | undefined;

  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      const start = index++;
      while (index < text.length && text[index] !== '"') {
        // A backslash consumes the next character whatever it is, so an escaped backslash cannot be
        // mistaken for the escape of a following quote.
        index += text[index] === '\\' ? 2 : 1;
      }
      out += text.slice(start, ++index);
      pendingComma = undefined;
      continue;
    }
    if (char === '/' && text[index + 1] === '/') {
      while (index < text.length && text[index] !== '\n') {
        index++;
      }
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      index = close === -1 ? text.length : close + 2;
      continue;
    }
    if ((char === '}' || char === ']') && pendingComma !== undefined) {
      out = out.slice(0, pendingComma) + out.slice(pendingComma + 1);
      pendingComma = undefined;
    }
    out += char;
    index++;
    if (char === ',') {
      pendingComma = out.length - 1;
    } else if (char.trim() !== '') {
      pendingComma = undefined;
    }
  }

  return JSON.parse(out);
};
