//
// Copyright 2026 DXOS.org
//

// Dependency-free YAML-frontmatter parser for the `.rule.md` and REVIEW.md
// subset. A standalone script cannot reliably resolve a workspace-hoisted YAML
// package under pnpm, and the subset here (scalars, inline arrays, block
// sequences) does not warrant a full YAML dependency.

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Strip a trailing ` # comment` from an unquoted scalar. A `#` without leading
 * whitespace is kept, so values like `a#b` survive.
 */
const stripComment = (value) => {
  const match = value.match(/\s+#.*$/);
  return match ? value.slice(0, match.index) : value;
};

/** Unwrap matching single/double quotes; otherwise return the trimmed input. */
export const unquote = (value) => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed.at(-1) === trimmed[0]) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

/** Parse an inline flow sequence `[a, b, "c"]` into an array of scalars. */
const parseInlineArray = (value) =>
  value
    .slice(1, -1)
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter((item) => item.length > 0);

/**
 * Parse a leading `---` frontmatter block plus the markdown body.
 *
 * @param {string} text
 * @returns {{ data: Record<string, string|string[]>, body: string }}
 */
export const parseFrontmatter = (text) => {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('missing YAML frontmatter (expected a leading `---` block)');
  }
  const [, front, body] = match;
  const data = {};
  const lines = front.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!keyMatch) {
      throw new Error(`unparseable frontmatter line: ${JSON.stringify(line)}`);
    }
    const key = keyMatch[1];
    const rest = keyMatch[2].trim();

    if (rest === '') {
      // Block sequence: consume following `  - item` lines.
      const items = [];
      while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) {
        items.push(unquote(lines[index + 1].replace(/^\s*-\s+/, '')));
        index++;
      }
      data[key] = items;
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      data[key] = parseInlineArray(rest);
    } else {
      data[key] = unquote(stripComment(rest));
    }
  }

  return { data, body: body.trimStart() };
};
