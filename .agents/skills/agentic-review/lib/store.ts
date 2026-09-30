//
// Copyright 2026 DXOS.org
//

// Review-store helpers: slug derivation, and read/write of REVIEW.md frontmatter.
// REVIEW.md frontmatter is a flat scalar block, so a small serializer suffices.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Severity } from './diagnostics.ts';
import { type ParsedFrontmatter, parseFrontmatter } from './frontmatter.ts';

export const REVIEWS_DIR = '.agents/reviews';

// Per-run manifest mapping group number → { ruleId, severity, title }, so
// finalize can enforce the rule-fixed severity independently of what a subagent
// wrote in its fragment header.
export const GROUPS_MANIFEST = 'groups.json';

/** One entry of `groups.json`: the rule and file scope a subagent group reviewed. */
export type GroupManifestEntry = {
  ruleId: string;
  severity: Severity;
  title: string;
  scope: 'full' | 'delta';
  files: string[];
};

/** `groups.json`'s shape: group number (zero-padded) → its manifest entry. */
export type GroupsManifest = Record<string, GroupManifestEntry>;

/** A value a REVIEW.md frontmatter field may hold before serialization. */
type FrontmatterValue = string | number | boolean | string[] | null | undefined;

/** Input to {@link renderFrontmatter}: a flat map of frontmatter fields. */
export type FrontmatterInput = Record<string, FrontmatterValue>;

/** Narrow shape of a Node.js errno exception, enough to read its `code`. */
type NodeErrnoError = { code?: string; message: string };

const isNodeErrnoError = (error: unknown): error is NodeErrnoError =>
  typeof error === 'object' && error !== null && 'message' in error;

/** Per-issue status ledger written by finalize; agents update statuses in place. */
export { RESOLUTION_FILE } from './resolution.ts';

/** Sentinel `base` when a run reviews the whole project rather than a diff. */
export const FULL_BASE = 'full';

/**
 * Short review id used as the `<review_id>` prefix in issue ids (`<id>-<seq>`).
 * Store dirs are the short sha; accept a legacy `…-<sha>` dir name too.
 */
export const reviewIdFromStore = (storeDirName: string, commit: string | null | undefined): string => {
  if (/^[0-9a-f]{7,40}$/i.test(storeDirName)) {
    return storeDirName;
  }
  const fromLegacy = storeDirName.match(/-([0-9a-f]{7,40})$/i)?.[1];
  if (fromLegacy) {
    return fromLegacy;
  }
  if (commit) {
    return String(commit).slice(0, 11);
  }
  throw new Error(`cannot derive review id for store ${JSON.stringify(storeDirName)}`);
};

/**
 * Review store directory name: just the short commit sha. Branch is omitted —
 * the commit already identifies the reviewed tree, and keeps paths short.
 */
export const reviewSlug = (_branch: string | null | undefined, short: string): string => short;

/**
 * Reject a `--slug` that is not a single safe path component — no separators,
 * no `.`/`..` — so a store path can never escape `.agents/reviews` (prepare
 * recursively removes `<store>/groups`, finalize overwrites `<store>/REVIEW.md`).
 */
export const assertSafeSlug = (slug: string): string => {
  if (!/^[A-Za-z0-9._-]+$/.test(slug) || slug === '.' || slug === '..') {
    throw new Error(`unsafe --slug ${JSON.stringify(slug)}: expected a single path component (no / or ..)`);
  }
  return slug;
};

/** Serialize a flat object into a REVIEW.md frontmatter block. */
export const renderFrontmatter = (data: FrontmatterInput): string => {
  const lines = Object.entries(data)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      // Inline arrays round-trip through parseFrontmatter's `[a, b]` form.
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      return `${key}: ${value}`;
    });
  return `---\n${lines.join('\n')}\n---\n`;
};

/**
 * Read a REVIEW.md into `{ data, body }`. Returns null only when the file is
 * absent (ENOENT); a malformed file or other I/O error propagates, so a corrupt
 * review is never mistaken for a missing one (which would let finalize skip it
 * and select an older run).
 */
export const readReview = (path: string): ParsedFrontmatter | null => {
  try {
    return parseFrontmatter(readFileSync(path, 'utf8'));
  } catch (error) {
    if (isNodeErrnoError(error)) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`cannot read ${path}: ${error.message}`);
    }
    throw new Error(`cannot read ${path}: ${String(error)}`);
  }
};

/**
 * Rule ids covered by a prior run: prefer the `rules:` frontmatter list, fall
 * back to `groups.json` so legacy finalized reviews still mark their rules as
 * seen (new rules then get a full-project first pass).
 */
export const ruleIdsFromReviewDir = (dir: string, review: ParsedFrontmatter | null = null): string[] => {
  const parsed = review ?? readReview(join(dir, 'REVIEW.md'));
  const fromFrontmatter = parsed?.data?.rules;
  if (Array.isArray(fromFrontmatter) && fromFrontmatter.length > 0) {
    return fromFrontmatter.map(String);
  }
  const manifestPath = join(dir, GROUPS_MANIFEST);
  if (!existsSync(manifestPath)) {
    return [];
  }
  try {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entries = typeof manifest === 'object' && manifest !== null ? Object.values(manifest) : [];
    return [
      ...new Set(
        entries
          .map((group) =>
            typeof group === 'object' && group !== null && 'ruleId' in group
              ? (group as { ruleId: unknown }).ruleId
              : undefined,
          )
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];
  } catch {
    // Best-effort: a corrupt/unreadable manifest falls back to "no rules seen",
    // so those rules get a conservative full re-scan rather than being skipped.
    return [];
  }
};
