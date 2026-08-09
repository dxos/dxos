#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Finalize an agentic review run: parse every group fragment, merge diagnostics
// into REVIEW.md (sorted, deduped), mark the run finalized, and print a summary.
//
// Usage:
//   node finalize.mjs [--slug=<slug>] [--dir=<path to review store>]
//
// With neither flag, the most recently modified non-finalized review is used.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { compareDiagnostics, diagnosticKey, parseDiagnostics, renderDiagnostic } from '../lib/diagnostics.mjs';
import { repoRoot } from '../lib/git.mjs';
import { REVIEWS_DIR, readReview, renderFrontmatter } from '../lib/store.mjs';

const { values } = parseArgs({
  options: {
    slug: { type: 'string' },
    dir: { type: 'string' },
  },
});

const root = repoRoot();

/** Locate the review store directory from --dir, --slug, or the newest run. */
const resolveStoreDir = () => {
  if (values.dir) {
    return values.dir;
  }
  const reviewsPath = join(root, REVIEWS_DIR);
  if (values.slug) {
    return join(reviewsPath, values.slug);
  }
  if (!existsSync(reviewsPath)) {
    throw new Error(`no reviews directory at ${REVIEWS_DIR}`);
  }
  const candidates = readdirSync(reviewsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(reviewsPath, entry.name))
    .filter((dir) => existsSync(join(dir, 'REVIEW.md')))
    .map((dir) => ({ dir, mtime: statSync(join(dir, 'REVIEW.md')).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) {
    throw new Error(`no review runs found under ${REVIEWS_DIR}`);
  }
  return candidates[0].dir;
};

const storeDir = resolveStoreDir();
const reviewPath = join(storeDir, 'REVIEW.md');
const review = readReview(reviewPath);
if (!review) {
  throw new Error(`cannot read ${reviewPath}`);
}

const groupsDir = join(storeDir, 'groups');
const diagnostics = [];
if (existsSync(groupsDir)) {
  for (const name of readdirSync(groupsDir).sort()) {
    if (name.endsWith('.md')) {
      diagnostics.push(...parseDiagnostics(readFileSync(join(groupsDir, name), 'utf8')));
    }
  }
}

// Dedupe identical diagnostics, then sort by file/line for a stable report.
const seen = new Set();
const merged = [];
for (const diagnostic of diagnostics) {
  const key = diagnosticKey(diagnostic);
  if (!seen.has(key)) {
    seen.add(key);
    merged.push(diagnostic);
  }
}
merged.sort(compareDiagnostics);

const counts = { error: 0, warn: 0 };
for (const diagnostic of merged) {
  counts[diagnostic.severity]++;
}

const frontmatter = renderFrontmatter({ ...review.data, isFinalized: true });
const bodyBlocks =
  merged.length === 0
    ? ['<!-- no diagnostics: clean -->']
    : [`_${counts.error} error(s), ${counts.warn} warning(s)._`, ...merged.map(renderDiagnostic)];
writeFileSync(reviewPath, `${frontmatter}\n${bodyBlocks.join('\n\n')}\n`);

const rel = reviewPath.slice(root.length + 1);
console.log(`REVIEW:  ${rel}`);
console.log(`errors:  ${counts.error}`);
console.log(`warns:   ${counts.warn}`);
console.log('finalized.');
