//
// Copyright 2026 DXOS.org
//

// RESOLUTION.md — one bullet per issue. Agents flip the status field as they
// address findings; `unresolved.mjs` scrapes unresolved rows across runs.
//
//   - <id> - <status> - <ruleId> - <file:line[:col]>

export const RESOLUTION_FILE = 'RESOLUTION.md';

export const STATUSES = ['unresolved', 'ignored', 'resolved'];

// Bullet form (current): `- id - status - rule - file:line[:col]`
const LINE_RE =
  /^\s*-\s+`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*-\s+(\S+)\s+-\s+(\S+)\s*$/i;
// Legacy one-field form kept so older ledgers still parse until re-finalized.
const LEGACY_LINE_RE = /^\s*`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*$/i;

/**
 * Parse RESOLUTION.md into a Map of issue id → status. Blank lines and `#` /
 * HTML comments are ignored; any other non-empty line throws.
 *
 * @param {string} text
 * @returns {Map<string, 'unresolved'|'ignored'|'resolved'>}
 */
export const parseResolution = (text) => {
  const statuses = new Map();
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
      continue;
    }
    const match = line.match(LINE_RE) ?? line.match(LEGACY_LINE_RE);
    if (!match) {
      throw new Error(
        `RESOLUTION.md:${index + 1}: unparseable line ${JSON.stringify(line)} — expected \`- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>\``,
      );
    }
    statuses.set(match[1], match[2].toLowerCase());
  }
  return statuses;
};

/**
 * Render RESOLUTION.md for a finalized run. New issues default to unresolved;
 * pass `priorStatuses` on re-finalize to keep agent updates.
 *
 * @param {string} slug
 * @param {Array<{ id: string, ruleId: string, file: string, line: number, col: number|null }>} diagnostics
 * @param {Map<string, string>|null} [priorStatuses]
 */
export const renderResolution = (slug, diagnostics, priorStatuses = null) => {
  const lines = [
    `# Resolution — ${slug}`,
    '',
    '<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->',
    '',
  ];
  if (diagnostics.length === 0) {
    lines.push('<!-- no issues -->', '');
  } else {
    for (const diagnostic of diagnostics) {
      const location = `${diagnostic.file}:${diagnostic.line}${
        diagnostic.col != null ? `:${diagnostic.col}` : ''
      }`;
      const status = priorStatuses?.get(diagnostic.id) ?? 'unresolved';
      lines.push(
        `- ${diagnostic.id} - ${status} - ${diagnostic.ruleId ?? 'unknown'} - ${location}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
};
