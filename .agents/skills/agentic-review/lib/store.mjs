//
// Copyright 2026 DXOS.org
//

// Review-store helpers: slug derivation, and read/write of REVIEW.md frontmatter.
// REVIEW.md frontmatter is a flat scalar block, so a small serializer suffices.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatter } from './frontmatter.mjs';

export const REVIEWS_DIR = '.agents/reviews';

// Per-run manifest mapping group number → { ruleId, severity, title }, so
// finalize can enforce the rule-fixed severity independently of what a subagent
// wrote in its fragment header.
export const GROUPS_MANIFEST = 'groups.json';

/** Sentinel `base` when a run reviews the whole project rather than a diff. */
export const FULL_BASE = 'full';

/**
 * Derive a review slug from a branch name and short commit: the branch with any
 * `claude/` prefix removed, slashes flattened, suffixed with the short sha.
 */
export const reviewSlug = (branch, short) => {
  const base = branch.replace(/^claude\//, '').replace(/[^A-Za-z0-9._-]+/g, '-');
  return `${base}-${short}`;
};

/**
 * Reject a `--slug` that is not a single safe path component — no separators,
 * no `.`/`..` — so a store path can never escape `.agents/reviews` (prepare
 * recursively removes `<store>/groups`, finalize overwrites `<store>/REVIEW.md`).
 */
export const assertSafeSlug = (slug) => {
  if (!/^[A-Za-z0-9._-]+$/.test(slug) || slug === '.' || slug === '..') {
    throw new Error(`unsafe --slug ${JSON.stringify(slug)}: expected a single path component (no / or ..)`);
  }
  return slug;
};

/** Serialize a flat object into a REVIEW.md frontmatter block. */
export const renderFrontmatter = (data) => {
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
export const readReview = (path) => {
  try {
    return parseFrontmatter(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw new Error(`cannot read ${path}: ${error.message}`);
  }
};

/**
 * Rule ids covered by a prior run: prefer the `rules:` frontmatter list, fall
 * back to `groups.json` so legacy finalized reviews still mark their rules as
 * seen (new rules then get a full-project first pass).
 */
export const ruleIdsFromReviewDir = (dir, review = null) => {
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
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return [
      ...new Set(
        Object.values(manifest)
          .map((group) => group?.ruleId)
          .filter((id) => typeof id === 'string' && id.length > 0),
      ),
    ];
  } catch {
    return [];
  }
};
