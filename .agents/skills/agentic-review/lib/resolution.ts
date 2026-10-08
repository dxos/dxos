//
// Copyright 2026 DXOS.org
//

// The `## Index` section of REVIEW.md — one bullet per issue. Agents flip the
// status field as they address findings; `unresolved.ts` scrapes unresolved rows
// across runs.
//
//   - <id> - <status> - <ruleId> - <file:line[:col]>

import { type IssuedDiagnostic } from './diagnostics.ts';

/** Pre-index ledger file, folded into REVIEW.md by finalize; still read so an unmigrated store parses. */
export const LEGACY_RESOLUTION_FILE = 'RESOLUTION.md';

export const STATUSES = ['unresolved', 'ignored', 'resolved'] as const;

/** A resolution status, as tracked in the REVIEW.md index. */
export type ResolutionStatus = (typeof STATUSES)[number];

// Bullet form (current): `- id - status - rule - file:line[:col]`
const LINE_RE = /^\s*-\s+`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*-\s+(\S+)\s+-\s+(\S+)\s*$/i;
// Legacy one-field form kept so older ledgers still parse until re-finalized.
const LEGACY_LINE_RE = /^\s*`?([A-Za-z0-9._]+-\d+)`?\s*-\s*(unresolved|ignored|resolved)\s*$/i;

const isResolutionStatus = (value: string): value is ResolutionStatus =>
  (STATUSES as readonly string[]).includes(value);

/** Both line regexes only ever capture one of `STATUSES`, so lower-cased this is always a `ResolutionStatus`. */
const toResolutionStatus = (value: string): ResolutionStatus => (isResolutionStatus(value) ? value : 'unresolved');

/** One index row; `ruleId` and `location` are absent on legacy one-field rows. */
export type ResolutionEntry = { id: string; status: ResolutionStatus; ruleId?: string; location?: string };

/** Index rows plus the non-empty lines that are neither a row, a heading nor a comment. */
export type ScannedResolution = { entries: ResolutionEntry[]; unparsed: { line: number; text: string }[] };

/** Scan an index section into its rows, in file order; blank lines and `#` / HTML comments are skipped. */
export const scanResolution = (text: string): ScannedResolution => {
  const scanned: ScannedResolution = { entries: [], unparsed: [] };
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
      continue;
    }
    const full = line.match(LINE_RE);
    const match = full ?? line.match(LEGACY_LINE_RE);
    if (!match) {
      scanned.unparsed.push({ line: index + 1, text: line });
      continue;
    }
    scanned.entries.push({
      id: match[1],
      status: toResolutionStatus(match[2].toLowerCase()),
      ...(full ? { ruleId: full[3], location: full[4] } : {}),
    });
  }
  return scanned;
};

/** Parse an index section into its rows (see {@link scanResolution}); any line that is not a row throws. */
export const parseResolutionEntries = (text: string): ResolutionEntry[] => {
  const { entries, unparsed } = scanResolution(text);
  if (unparsed.length > 0) {
    const [{ line, text: bad }] = unparsed;
    throw new Error(
      `index:${line}: unparseable line ${JSON.stringify(bad)} — expected \`- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>\` (notes belong in the appendix)`,
    );
  }
  return entries;
};

/**
 * Render the index rows for a finalized run. New issues default to unresolved;
 * pass `priorStatuses` on re-finalize to keep agent updates.
 */
export const renderResolution = (
  diagnostics: IssuedDiagnostic[],
  priorStatuses: Map<string, ResolutionStatus> | null = null,
): string => {
  const lines = ['<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->', ''];
  if (diagnostics.length === 0) {
    lines.push('<!-- no issues -->');
  } else {
    for (const diagnostic of diagnostics) {
      const location = `${diagnostic.file}:${diagnostic.line}${diagnostic.col != null ? `:${diagnostic.col}` : ''}`;
      const status = priorStatuses?.get(diagnostic.id) ?? 'unresolved';
      lines.push(`- ${diagnostic.id} - ${status} - ${diagnostic.ruleId ?? 'unknown'} - ${location}`);
    }
  }
  return lines.join('\n');
};
