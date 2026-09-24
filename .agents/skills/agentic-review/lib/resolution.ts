//
// Copyright 2026 DXOS.org
//

// RESOLUTION.md — one bullet per issue. Agents flip the status field as they
// address findings; `unresolved.ts` scrapes unresolved rows across runs.
//
//   - <id> - <status> - <ruleId> - <file:line[:col]>

import { type IssuedDiagnostic } from './diagnostics.ts';

export const RESOLUTION_FILE = 'RESOLUTION.md';

export const STATUSES = ['unresolved', 'ignored', 'resolved'] as const;

/** A resolution status, as tracked in RESOLUTION.md. */
export type ResolutionStatus = (typeof STATUSES)[number];

// Bullet form (current): `- id - status - rule - file:line[:col]`
const LINE_RE = /^\s*-\s+`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*-\s+(\S+)\s+-\s+(\S+)\s*$/i;
// Legacy one-field form kept so older ledgers still parse until re-finalized.
const LEGACY_LINE_RE = /^\s*`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*$/i;

const isResolutionStatus = (value: string): value is ResolutionStatus =>
  (STATUSES as readonly string[]).includes(value);

/** Both line regexes only ever capture one of `STATUSES`, so lower-cased this is always a `ResolutionStatus`. */
const toResolutionStatus = (value: string): ResolutionStatus => (isResolutionStatus(value) ? value : 'unresolved');

/**
 * Parse RESOLUTION.md into a Map of issue id → status. Blank lines and `#` /
 * HTML comments are ignored; any other non-empty line throws.
 */
export const parseResolution = (text: string): Map<string, ResolutionStatus> => {
  const statuses = new Map<string, ResolutionStatus>();
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
    statuses.set(match[1], toResolutionStatus(match[2].toLowerCase()));
  }
  return statuses;
};

/**
 * Render RESOLUTION.md for a finalized run. New issues default to unresolved;
 * pass `priorStatuses` on re-finalize to keep agent updates.
 */
export const renderResolution = (
  slug: string,
  diagnostics: IssuedDiagnostic[],
  priorStatuses: Map<string, ResolutionStatus> | null = null,
): string => {
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
      const location = `${diagnostic.file}:${diagnostic.line}${diagnostic.col != null ? `:${diagnostic.col}` : ''}`;
      const status = priorStatuses?.get(diagnostic.id) ?? 'unresolved';
      lines.push(`- ${diagnostic.id} - ${status} - ${diagnostic.ruleId ?? 'unknown'} - ${location}`);
    }
    lines.push('');
  }
  return lines.join('\n');
};
