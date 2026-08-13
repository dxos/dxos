#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Finalize an agentic review run: parse every group fragment, merge diagnostics
// into REVIEW.md (sorted, deduped, each stamped with `<review_id>-<seq>`), write
// RESOLUTION.md, delete intermediate staging/group files, and print a summary.
//
// Usage:
//   node finalize.mjs [--slug=<slug>] [--dir=<path to review store>] [--force]
//   node finalize.mjs --all [--force]
//
// With neither --slug/--dir/--all, the most recently modified non-finalized
// review is used. `--force` re-finalizes an already-finalized run. `--all` walks
// every store under `.agents/reviews/` (skips finalized unless `--force`).
// After a successful finalize the store keeps only REVIEW.md + RESOLUTION.md.

import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  assignIssueIds,
  compareDiagnostics,
  diagnosticKey,
  parseDiagnostics,
  renderDiagnostic,
} from '../lib/diagnostics.mjs';
import { repoRoot } from '../lib/git.mjs';
import { parseResolution, renderResolution, RESOLUTION_FILE } from '../lib/resolution.mjs';
import {
  assertSafeSlug,
  GROUPS_MANIFEST,
  REVIEWS_DIR,
  readReview,
  renderFrontmatter,
  reviewIdFromStore,
} from '../lib/store.mjs';

const STAGING_FILE = 'STAGING.md';
const INTERMEDIATES = [STAGING_FILE, GROUPS_MANIFEST, 'groups'];

const { values } = parseArgs({
  options: {
    slug: { type: 'string' },
    dir: { type: 'string' },
    force: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
  },
});

const root = repoRoot();
const force = values.force === true;

/** Locate store dirs to finalize. */
const resolveStoreDirs = () => {
  const reviewsPath = join(root, REVIEWS_DIR);
  if (values.dir) {
    return [values.dir];
  }
  if (values.slug) {
    return [join(reviewsPath, assertSafeSlug(values.slug))];
  }
  if (!existsSync(reviewsPath)) {
    throw new Error(`no reviews directory at ${REVIEWS_DIR}`);
  }
  if (values.all) {
    return readdirSync(reviewsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(reviewsPath, entry.name))
      .sort();
  }
  // Pick the most recently modified pending run (or any run with --force).
  const candidates = readdirSync(reviewsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(reviewsPath, entry.name))
    .map((dir) => ({ dir, review: readReview(join(dir, 'REVIEW.md')) }))
    .filter(({ review }) => {
      if (force) {
        return true;
      }
      // Pending = missing REVIEW or explicitly not finalized.
      return review == null || String(review.data.isFinalized) === 'false';
    })
    .map(({ dir }) => {
      const reviewPath = join(dir, 'REVIEW.md');
      const mtime = existsSync(reviewPath) ? statSync(reviewPath).mtimeMs : statSync(dir).mtimeMs;
      return { dir, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) {
    throw new Error(`no pending (non-finalized) review runs found under ${REVIEWS_DIR}`);
  }
  return [candidates[0].dir];
};

/** Minimal REVIEW.md when a store only has groups/STAGING (orphan fragment run). */
const ensureReviewStub = (storeDir, slug) => {
  const reviewPath = join(storeDir, 'REVIEW.md');
  if (existsSync(reviewPath)) {
    return readReview(reviewPath);
  }
  const short = slug.match(/-([0-9a-f]{7,40})$/i)?.[1] ?? slug;
  const data = {
    branch: 'unknown',
    commit: short,
    base: 'full',
    createdAt: new Date().toISOString(),
    isFinalized: false,
    groups: 0,
  };
  writeFileSync(reviewPath, `${renderFrontmatter(data)}\n<!-- diagnostics merged here at finalize -->\n`);
  return { data, body: '' };
};

const finalizeStore = (storeDir) => {
  const slug = basename(storeDir);
  const reviewPath = join(storeDir, 'REVIEW.md');
  const review = ensureReviewStub(storeDir, slug);
  if (!review) {
    throw new Error(`cannot read ${reviewPath}`);
  }
  if (String(review.data.isFinalized) === 'true' && !force) {
    console.log(`skip:     ${slug} (already finalized; pass --force)`);
    return { skipped: true };
  }

  // Prefer group fragments (fresh run). After intermediates are pruned, --force
  // re-reads the already-stamped REVIEW.md body so ids/statuses can be refreshed.
  const manifestPath = join(storeDir, GROUPS_MANIFEST);
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const groupsDir = join(storeDir, 'groups');
  const groupFiles = existsSync(groupsDir)
    ? readdirSync(groupsDir)
        .filter((name) => name.endsWith('.md'))
        .sort()
    : [];

  const diagnostics = [];
  let fromGroups = false;
  if (groupFiles.length > 0) {
    fromGroups = true;
    for (const name of groupFiles) {
      const nn = name.replace(/\.md$/, '');
      const rule = manifest[nn];
      const parsed = parseDiagnostics(readFileSync(join(groupsDir, name), 'utf8'), `groups/${name}`);
      for (const diagnostic of parsed) {
        // Rule severity + id win; fall back to the parsed value only for a manifest-less run.
        diagnostics.push({
          ...diagnostic,
          severity: rule?.severity ?? diagnostic.severity,
          ruleId: rule?.ruleId ?? diagnostic.ruleId ?? 'unknown',
        });
      }
    }
  } else if (review.body?.trim()) {
    for (const diagnostic of parseDiagnostics(review.body, `${slug}/REVIEW.md`)) {
      diagnostics.push({
        ...diagnostic,
        ruleId: diagnostic.ruleId ?? 'unknown',
      });
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

  const reviewId = reviewIdFromStore(slug, review.data.commit);
  // Fresh from groups → assign ids; REVIEW re-read → keep existing ids.
  const numbered = fromGroups
    ? assignIssueIds(merged, reviewId)
    : merged.map((diagnostic, index) =>
        diagnostic.id != null ? diagnostic : { ...diagnostic, id: `${reviewId}-${index + 1}` },
      );

  const counts = { error: 0, warn: 0 };
  for (const diagnostic of numbered) {
    counts[diagnostic.severity]++;
  }

  const groupCount = fromGroups ? groupFiles.length : Number(review.data.groups) || 0;
  const appliedRuleIds = [
    ...new Set(numbered.map((diagnostic) => diagnostic.ruleId).filter((id) => id && id !== 'unknown')),
  ].sort();

  // Preserve agent-updated statuses on --force; new issues default to unresolved.
  const resolutionPath = join(storeDir, RESOLUTION_FILE);
  let priorStatuses = null;
  if (existsSync(resolutionPath)) {
    try {
      priorStatuses = parseResolution(readFileSync(resolutionPath, 'utf8'));
    } catch (error) {
      // A corrupt RESOLUTION.md must not abort finalize, but surface it —
      // silently resetting every issue to unresolved would hide lost statuses.
      console.error(
        `warning: ${slug}/${RESOLUTION_FILE} unparseable (${error.message}); statuses reset to unresolved.`,
      );
      priorStatuses = null;
    }
  }

  const frontmatter = renderFrontmatter({
    ...review.data,
    isFinalized: true,
    reviewId,
    groups: groupCount,
    rules: appliedRuleIds.length > 0 ? appliedRuleIds : review.data.rules,
  });
  const bodyBlocks =
    numbered.length === 0
      ? ['<!-- no diagnostics: clean -->']
      : [`_${counts.error} error(s), ${counts.warn} warning(s)._`, ...numbered.map(renderDiagnostic)];
  writeFileSync(reviewPath, `${frontmatter}\n${bodyBlocks.join('\n\n')}\n`);
  writeFileSync(resolutionPath, renderResolution(slug, numbered, priorStatuses));

  // Staging + group fragments are ephemeral; only the finalized ledger remains.
  for (const name of INTERMEDIATES) {
    rmSync(join(storeDir, name), { recursive: true, force: true });
  }

  const rel = reviewPath.slice(root.length + 1);
  console.log(`REVIEW:     ${rel}`);
  console.log(`RESOLUTION: ${rel.replace(/REVIEW\.md$/, RESOLUTION_FILE)}`);
  console.log(`reviewId:   ${reviewId}`);
  console.log(`errors:     ${counts.error}`);
  console.log(`warns:      ${counts.warn}`);
  console.log(`issues:     ${numbered.length}`);
  console.log('finalized.');
  return { skipped: false, issues: numbered.length };
};

const dirs = resolveStoreDirs();
let finalized = 0;
let skipped = 0;
for (const dir of dirs) {
  const result = finalizeStore(dir);
  if (result?.skipped) {
    skipped++;
  } else {
    finalized++;
  }
  if (dirs.length > 1) {
    console.log('');
  }
}
if (dirs.length > 1) {
  console.log(`done: ${finalized} finalized, ${skipped} skipped`);
}
