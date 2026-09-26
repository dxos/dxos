//
// Copyright 2026 DXOS.org
//

// What CI asks of a PR's committed reviews: that one exists, that every issue it raised is
// resolved or ignored, and that the code has not drifted too far from the reviewed commit.
// Drift is LOC(changes since the review) / LOC(the PR's diff), both counted without merge
// commits, lockfiles, generated files, or the review store itself.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { commitTimestamp, git, isAncestor } from './git.ts';
import { RESOLUTION_FILE, type ResolutionEntry, parseResolutionEntries } from './resolution.ts';
import { REVIEWS_DIR, readReview } from './store.ts';

/** Largest fraction of the PR's diff that may have changed since the newest review. */
export const DRIFT_LIMIT = 0.2;

/** Command CI suggests: the Jev-only review, cheap enough to re-run on every push. */
export const FAST_COMMAND = 'bun .agents/skills/agentic-review/scripts/fast.ts';

const LOCKFILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'shrinkwrap.yaml',
]);

/** Paths drift never counts: churn in them says nothing about whether the review still holds. */
export const isStructurallyExcluded = (path: string): boolean =>
  path.startsWith(`${REVIEWS_DIR}/`) || LOCKFILES.has(path.split('/').at(-1) ?? path);

/** One `--numstat` row; binary files (`-\t-`) carry no line counts and are dropped on parse. */
export type NumstatEntry = { path: string; loc: number };

/** Parse `git --numstat --no-renames` output into added + deleted lines per path. */
export const parseNumstat = (text: string): NumstatEntry[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.match(/^(\d+)\t(\d+)\t(.+)$/))
    .filter((match): match is RegExpMatchArray => match != null)
    .map((match) => ({ path: match[3], loc: Number(match[1]) + Number(match[2]) }));

/** Paths `.gitattributes` marks `linguist-generated`, which GitHub also collapses in review. */
const generatedPaths = (paths: string[], cwd?: string): Set<string> => {
  if (paths.length === 0) {
    return new Set();
  }
  const out = git(['check-attr', '--stdin', 'linguist-generated'], { cwd, input: `${paths.join('\n')}\n` });
  return new Set(
    out
      .split(/\r?\n/)
      .map((line) => line.match(/^(.*): linguist-generated: (.*)$/))
      .filter(
        (match): match is RegExpMatchArray =>
          match != null && match[2] !== 'unset' && match[2] !== 'false' && match[2] !== 'unspecified',
      )
      .map((match) => match[1]),
  );
};

/** Sum the lines of `entries`, leaving out lockfiles, generated files, and review stores. */
export const countLoc = (entries: NumstatEntry[], cwd?: string): number => {
  const candidates = entries.filter(({ path }) => !isStructurallyExcluded(path));
  const generated = generatedPaths([...new Set(candidates.map(({ path }) => path))], cwd);
  return candidates.filter(({ path }) => !generated.has(path)).reduce((sum, { loc }) => sum + loc, 0);
};

/** LOC of the PR's net diff from `base`; a merge-base diff already leaves main's changes out. */
export const prLoc = (base: string, cwd?: string): number =>
  countLoc(parseNumstat(git(['diff', '--numstat', '--no-renames', base, 'HEAD'], { cwd })), cwd);

/**
 * LOC changed since `reviewed`, summed over the non-merge commits on HEAD's first-parent line,
 * so neither a merge from main nor its conflict resolution counts as drift.
 */
export const driftLoc = (reviewed: string, cwd?: string): number =>
  countLoc(
    parseNumstat(
      git(['log', '--first-parent', '--no-merges', '--numstat', '--no-renames', '--format=', `${reviewed}..HEAD`], {
        cwd,
      }),
    ),
    cwd,
  );

/** A review store this PR adds or updates. */
export type PrReview = {
  slug: string;
  commit: string | null;
  mode: string | null;
  finalized: boolean;
  entries: ResolutionEntry[];
  error?: string;
};

/** Review stores whose REVIEW.md this PR's diff from `base` adds or changes. */
export const findPrReviews = (base: string, root: string): PrReview[] => {
  const changed = git(['diff', '--name-only', '--diff-filter=AM', base, 'HEAD', '--', REVIEWS_DIR], { cwd: root });
  const slugs = changed
    .split(/\r?\n/)
    .filter((path) => path.startsWith(`${REVIEWS_DIR}/`) && path.endsWith('/REVIEW.md'))
    .map((path) => path.slice(REVIEWS_DIR.length + 1, -'/REVIEW.md'.length))
    .filter((slug) => slug.length > 0 && !slug.includes('/'));
  return slugs.map((slug) => {
    const dir = join(root, REVIEWS_DIR, slug);
    const review = readReview(join(dir, 'REVIEW.md'));
    const commit = typeof review?.data.commit === 'string' ? review.data.commit : null;
    const mode = typeof review?.data.mode === 'string' ? review.data.mode : null;
    const finalized = String(review?.data.isFinalized) === 'true';
    const resolutionPath = join(dir, RESOLUTION_FILE);
    try {
      const entries = existsSync(resolutionPath) ? parseResolutionEntries(readFileSync(resolutionPath, 'utf8')) : [];
      return { slug, commit, mode, finalized, entries };
    } catch (error) {
      return {
        slug,
        commit,
        mode,
        finalized,
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
};

/** Outcome of {@link checkPr}; `problems` is empty exactly when `ok`. */
export type PrCheck = {
  ok: boolean;
  problems: string[];
  reviews: PrReview[];
  latest: PrReview | null;
  prLoc: number;
  driftLoc: number | null;
  drift: number | null;
  unresolved: (ResolutionEntry & { slug: string })[];
};

/** Judge the PR at HEAD against `base` (its merge-base with the target branch). */
export const checkPr = ({
  base,
  root,
  limit = DRIFT_LIMIT,
}: {
  base: string;
  root: string;
  limit?: number;
}): PrCheck => {
  const total = prLoc(base, root);
  const reviews = findPrReviews(base, root);
  const result: PrCheck = {
    ok: true,
    problems: [],
    reviews,
    latest: null,
    prLoc: total,
    driftLoc: null,
    drift: null,
    unresolved: [],
  };
  const fail = (problem: string): PrCheck => {
    result.ok = false;
    result.problems.push(problem);
    return result;
  };
  if (total === 0) {
    return result;
  }
  if (reviews.length === 0) {
    return fail(`no agentic review is committed on this branch (no \`${REVIEWS_DIR}/<sha>/REVIEW.md\` in the diff).`);
  }
  for (const review of reviews) {
    if (!review.finalized) {
      fail(`review \`${review.slug}\` is not finalized — run \`finalize.ts --slug=${review.slug}\`.`);
    }
    if (review.error) {
      fail(`review \`${review.slug}\` has an unreadable ${RESOLUTION_FILE}: ${review.error}`);
    }
    for (const entry of review.entries) {
      if (entry.status === 'unresolved') {
        result.unresolved.push({ ...entry, slug: review.slug });
      }
    }
  }
  if (result.unresolved.length > 0) {
    fail(
      `${result.unresolved.length} issue(s) are still \`unresolved\` — fix each, or mark it \`resolved\`/\`ignored\` in ${RESOLUTION_FILE}.`,
    );
  }

  // The newest review whose commit is in this branch's history anchors the drift measure.
  const reachable = reviews
    .filter((review) => review.finalized && review.commit && isAncestor(review.commit, 'HEAD', root))
    .map((review) => ({ review, timestamp: commitTimestamp(review.commit ?? '', root) }))
    .sort((left, right) => right.timestamp - left.timestamp);
  const latest = reachable[0]?.review ?? null;
  result.latest = latest;
  if (!latest?.commit) {
    return fail("no finalized review was made at a commit in this branch's history (rebased or squashed since?).");
  }
  result.driftLoc = driftLoc(latest.commit, root);
  result.drift = result.driftLoc / total;
  if (result.drift > limit) {
    fail(
      `code drifted ${(result.drift * 100).toFixed(1)}% since review \`${latest.slug}\` (${result.driftLoc} of ${total} LOC; limit ${Math.round(limit * 100)}%).`,
    );
  }
  return result;
};

/** Markdown report of a {@link PrCheck}, for the terminal and the CI step summary. */
export const renderPrCheck = (check: PrCheck): string => {
  const lines = [`## Agentic review — ${check.ok ? 'pass' : 'needs attention'}`, ''];
  if (check.prLoc === 0) {
    lines.push('Nothing to review: the PR changes only lockfiles, generated files, or review stores.');
    return lines.join('\n');
  }
  lines.push(
    `- PR diff: ${check.prLoc} LOC (lockfiles, generated files and merges excluded)`,
    `- reviews on this branch: ${check.reviews.length === 0 ? 'none' : check.reviews.map((review) => `\`${review.slug}\` (${review.mode ?? 'unknown mode'})`).join(', ')}`,
  );
  if (check.latest && check.drift != null) {
    lines.push(`- drift since \`${check.latest.slug}\`: ${(check.drift * 100).toFixed(1)}% (${check.driftLoc} LOC)`);
  }
  if (check.problems.length > 0) {
    lines.push('', ...check.problems.map((problem) => `- ❌ ${problem}`));
  }
  if (check.unresolved.length > 0) {
    lines.push(
      '',
      '### Unresolved',
      '',
      ...check.unresolved.map(
        ({ id, ruleId, location, slug }) =>
          `- \`${id}\` ${ruleId ?? ''} ${location ? `\`${location}\`` : ''} (${slug})`,
      ),
    );
  }
  if (!check.ok) {
    lines.push(
      '',
      '### To fix',
      '',
      'Run the fast review (Jev only, no subagents), commit the store it writes, then work its RESOLUTION.md:',
      '',
      '```sh',
      FAST_COMMAND,
      '```',
      '',
      'Set every issue to `resolved` (fixed) or `ignored` (a false positive or out of scope). This check is advisory and never blocks merge.',
    );
  }
  return lines.join('\n');
};
