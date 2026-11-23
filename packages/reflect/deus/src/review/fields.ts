//
// Copyright 2026 DXOS.org
//

const indentOf = (line: string): number => line.length - line.trimStart().length;

/**
 * The top-level fields of a block body: a field's inline value, or for a `|` block or nested map, its
 * indented lines with the common indent removed.
 */
export const parseFields = (body: string): Map<string, { inline?: string; lines: string[] }> => {
  const lines = body.split('\n');
  const contentIndents = lines.filter((line) => line.trim() !== '').map(indentOf);
  const base = contentIndents.length > 0 ? Math.min(...contentIndents) : 0;
  const fields = new Map<string, { inline?: string; lines: string[] }>();
  let current: { inline?: string; lines: string[] } | undefined;
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const match = indentOf(line) === base && line.trim().match(/^([\w-]+)(\??):(?:\s+(.*))?$/);
    if (match) {
      const inline = match[3]?.trim();
      current = { inline: inline && inline !== '|' && inline !== '>' ? inline : undefined, lines: [] };
      fields.set(match[1], current);
    } else if (current && indentOf(line) > base) {
      current.lines.push(line.trim());
    }
  }
  return fields;
};
