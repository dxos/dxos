//
// Copyright 2026 DXOS.org
//

// Fails when a changed .mdl spec has no new `## Changelog` decision, or edits the log in place (lang/changelog.mdl).
// Whitespace and small typo fixes need no decision; a `Spec-Changelog-Skip: <reason>` commit trailer waives the rule.
// Usage: node packages/reflect/deus/scripts/check-changelog.ts — compares the working tree with the merge base of
// MDL_BASE_REF (default origin/main), so a local run also covers uncommitted edits.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { MISSING_DECISION, checkChangelogChange, lintMdl } from '../src/extension/check.ts';

// A commit trailer that waives the missing-decision rule for a bulk mechanical edit; append-only rules still apply.
const WAIVER = 'Spec-Changelog-Skip';

// Language definitions, review rules, spec reviews and test fixtures are .mdl files but not specs.
const EXEMPT = [/^packages\/reflect\/deus\/lang\//, /\/__fixtures__\//, /(^|\/)rules\//, /\.review\.mdl$/];

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim();
const lines = (text: string): string[] => text.split('\n').filter(Boolean);

// The rule is diff-based: on `main` every spec's history is already merged, so only a branch run means anything.
const event = process.env.GITHUB_EVENT_NAME;
if (event && event !== 'pull_request') {
  console.log(`Skipping on \`${event}\` — the changelog check is diff-based.`);
  process.exit(0);
}

const baseRef = process.env.MDL_BASE_REF || 'origin/main';
let base: string;
try {
  base = git('merge-base', baseRef, 'HEAD');
} catch {
  base = baseRef;
}

const waivers = lines(git('log', `${base}..HEAD`, `--format=%(trailers:key=${WAIVER},valueonly)`));
if (waivers.length > 0) {
  console.log(`Missing-decision rule waived by ${WAIVER}: ${waivers.join('; ')}`);
}

// Path in the working tree → path at the base (undefined for a new file).
const changed = new Map<string, string | undefined>();
for (const line of lines(git('diff', '--name-status', '-M', '--diff-filter=AMR', base, '--', '*.mdl'))) {
  const [status, ...paths] = line.split('\t');
  changed.set(paths[paths.length - 1], status === 'A' ? undefined : paths[0]);
}
for (const path of lines(git('ls-files', '--others', '--exclude-standard', '--', '*.mdl'))) {
  changed.set(path, undefined);
}

let failures = 0;
for (const [path, basePath] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
  if (EXEMPT.some((pattern) => pattern.test(path))) {
    continue;
  }
  const after = readFileSync(path, 'utf8');
  const before = basePath === undefined ? undefined : git('show', `${base}:${basePath}`);
  const errors = [
    ...checkChangelogChange(before, after).filter((error) => waivers.length === 0 || error !== MISSING_DECISION),
    ...lintMdl(after)
      .filter(({ source }) => source === 'mdl/decision')
      .map(({ message }) => message),
  ];
  for (const error of errors) {
    console.log(`${path}: ${error}`);
  }
  failures += errors.length;
}

if (failures > 0) {
  console.log(`\n${failures} changelog error(s). Every spec change adds a decision — see .agents/skills/mdl/SKILL.md.`);
  process.exit(1);
}
console.log(`OK: ${changed.size} changed .mdl file(s) checked against ${baseRef}.`);
