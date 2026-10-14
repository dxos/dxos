//
// Copyright 2026 DXOS.org
//

// The body of a finalized REVIEW.md, the one file a review store keeps:
//
//   _<counts>_
//   ## Index      — the issue ledger agents edit (see resolution.ts)
//   ## Issues     — one diagnostic per issue (see diagnostics.ts)
//   ## Appendix   — how the run was made (System One stats); read by people, never parsed
//
// A body with no `## Index` / `## Issues` heading predates this layout and is all issues.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type IssuedDiagnostic, renderDiagnostic } from './diagnostics.ts';
import {
  LEGACY_RESOLUTION_FILE,
  type ResolutionEntry,
  type ResolutionStatus,
  parseResolutionEntries,
  renderResolution,
  scanResolution,
} from './resolution.ts';

export const REVIEW_FILE = 'REVIEW.md';

/** Pre-appendix System One report, folded into the REVIEW.md appendix by finalize. */
export const LEGACY_SYSTEM_ONE_FILE = 'SYSTEM-ONE.md';

const SECTION_RE = /^## (Index|Issues|Appendix)\s*$/;

const FRONTMATTER_HEAD_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/;

/** A REVIEW.md body cut at its section headings; each part excludes its heading. */
export type ReviewSections = { preamble: string; index: string | null; issues: string; appendix: string };

/** Split a REVIEW.md body into its sections. */
export const splitReviewBody = (body: string): ReviewSections => {
  const parts: Record<'preamble' | 'Index' | 'Issues' | 'Appendix', string[]> = {
    preamble: [],
    Index: [],
    Issues: [],
    Appendix: [],
  };
  let current: keyof typeof parts = 'preamble';
  let hasIndex = false;
  let hasIssues = false;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(SECTION_RE)?.[1];
    if (heading === 'Index' || heading === 'Issues' || heading === 'Appendix') {
      current = heading;
      hasIndex ||= heading === 'Index';
      hasIssues ||= heading === 'Issues';
      continue;
    }
    parts[current].push(line);
  }
  const text = (lines: string[]): string => lines.join('\n').trim();
  if (!hasIndex && !hasIssues) {
    return { preamble: '', index: null, issues: text(parts.preamble), appendix: text(parts.Appendix) };
  }
  return {
    preamble: text(parts.preamble),
    index: hasIndex ? text(parts.Index) : null,
    issues: text(parts.Issues),
    appendix: text(parts.Appendix),
  };
};

/** Render a finalized REVIEW.md body: counts, index, issues, then the appendix when there is one. */
export const renderReviewBody = ({
  diagnostics,
  statuses,
  appendix,
}: {
  diagnostics: IssuedDiagnostic[];
  statuses: Map<string, ResolutionStatus> | null;
  appendix: string;
}): string => {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const blocks = [
    diagnostics.length === 0
      ? '_Clean: no issues._'
      : `_${errors} error(s), ${diagnostics.length - errors} warning(s)._`,
    '## Index',
    renderResolution(diagnostics, statuses),
  ];
  if (diagnostics.length > 0) {
    blocks.push('## Issues', ...diagnostics.map(renderDiagnostic));
  }
  if (appendix.trim()) {
    blocks.push('## Appendix', appendix.trim());
  }
  return `${blocks.join('\n\n')}\n`;
};

/**
 * Index rows of a store: its REVIEW.md `## Index`, else a legacy RESOLUTION.md, else none.
 * Throws when the ledger it finds does not parse.
 */
export const readIndexEntries = (dir: string, body: string): ResolutionEntry[] => {
  const { index } = splitReviewBody(body);
  if (index != null) {
    return parseResolutionEntries(index);
  }
  const legacyPath = join(dir, LEGACY_RESOLUTION_FILE);
  return existsSync(legacyPath) ? parseResolutionEntries(readFileSync(legacyPath, 'utf8')) : [];
};

/** Replace the appendix of the REVIEW.md at `path`, leaving its frontmatter and other sections alone. */
export const writeAppendix = (path: string, appendix: string): void => {
  const match = readFileSync(path, 'utf8').match(FRONTMATTER_HEAD_RE);
  if (!match) {
    throw new Error(`${path}: missing YAML frontmatter (expected a leading \`---\` block)`);
  }
  const [, head, body] = match;
  const withoutAppendix = body.split(/^## Appendix\s*$/m)[0].trim();
  writeFileSync(path, `${head}\n${withoutAppendix}\n\n## Appendix\n\n${appendix.trim()}\n`);
};

/**
 * Fold a store's legacy side files for finalize: statuses and stray notes from RESOLUTION.md, and
 * the SYSTEM-ONE.md run metadata. Returns null when the store has neither.
 */
export const readLegacySideFiles = (
  dir: string,
): { statuses: Map<string, ResolutionStatus> | null; appendix: string } | null => {
  const resolutionPath = join(dir, LEGACY_RESOLUTION_FILE);
  const systemOnePath = join(dir, LEGACY_SYSTEM_ONE_FILE);
  if (!existsSync(resolutionPath) && !existsSync(systemOnePath)) {
    return null;
  }
  const blocks: string[] = [];
  let statuses: Map<string, ResolutionStatus> | null = null;
  if (existsSync(resolutionPath)) {
    const { entries, unparsed } = scanResolution(readFileSync(resolutionPath, 'utf8'));
    statuses = new Map(entries.map(({ id, status }) => [id, status]));
    if (unparsed.length > 0) {
      blocks.push('### Resolution notes', unparsed.map(({ text }) => text).join('\n'));
    }
  }
  if (existsSync(systemOnePath)) {
    blocks.push(legacySystemOneAppendix(readFileSync(systemOnePath, 'utf8')));
  }
  return { statuses, appendix: blocks.join('\n\n') };
};

/** A legacy SYSTEM-ONE.md as an appendix: its run metadata, without the follow-up list. */
export const legacySystemOneAppendix = (text: string): string =>
  text
    .split(/^## Still needs an agentic reviewer\s*$/m)[0]
    .replace(/^# System One pass.*$/m, '### System One pass')
    .trim();
