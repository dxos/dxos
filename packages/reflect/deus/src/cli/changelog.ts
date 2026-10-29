//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';

import { MISSING_DECISION, checkChangelogChange, lintMdl } from '../extension/check.ts';
import { ChangelogCheckError } from './errors.ts';
import { git, lines } from './git.ts';

/** A commit trailer that waives the missing-decision rule for a bulk mechanical edit; append-only rules still apply. */
export const WAIVER = 'Spec-Changelog-Skip';

/** Language definitions, review rules, spec reviews and test fixtures are .mdl files but not specs. */
const EXEMPT = [/^packages\/reflect\/deus\/lang\//, /\/__fixtures__\//, /(^|\/)rules\//, /\.review\.mdl$/];

export const DEFAULT_BASE_REF = 'origin/main';

export type ChangelogCheckOptions = {
  /** Ref whose merge base with HEAD the working tree is compared against. */
  base: string;
  /** Repository directory; any path inside the work tree. */
  cwd: string;
  /** `GITHUB_EVENT_NAME`; the check runs only for pull requests or outside CI. */
  event: string;
};

/**
 * Fails when a changed .mdl spec has no new `## Changelog` decision, or edits the log in place (lang/changelog.mdl).
 * Whitespace and small typo fixes need no decision; a `Spec-Changelog-Skip: <reason>` commit trailer waives the rule.
 * Compares the working tree with the merge base of `base`, so a local run also covers uncommitted edits.
 */
export const checkChangelog = Effect.fnUntraced(function* ({ base: baseRef, cwd, event }: ChangelogCheckOptions) {
  // The rule is diff-based: on `main` every spec's history is already merged, so only a branch run means anything.
  if (event && event !== 'pull_request') {
    yield* Console.log(`Skipping on \`${event}\` - the changelog check is diff-based.`);
    return;
  }

  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* git(cwd, 'rev-parse', '--show-toplevel');
  const base = yield* git(root, 'merge-base', baseRef, 'HEAD').pipe(Effect.orElseSucceed(() => baseRef));

  const waivers = lines(yield* git(root, 'log', `${base}..HEAD`, `--format=%(trailers:key=${WAIVER},valueonly)`));
  if (waivers.length > 0) {
    yield* Console.log(`Missing-decision rule waived by ${WAIVER}: ${waivers.join('; ')}`);
  }

  // Path in the working tree -> path at the base (undefined for a new file).
  const changed = new Map<string, string | undefined>();
  // Unquoted paths, so a non-ASCII file name reads back as the file it names.
  const quotePath = ['-c', 'core.quotePath=false'];
  for (const line of lines(
    yield* git(root, ...quotePath, 'diff', '--name-status', '-M', '--diff-filter=AMR', base, '--', '*.mdl'),
  )) {
    const [status, ...paths] = line.split('\t');
    changed.set(paths[paths.length - 1], status === 'A' ? undefined : paths[0]);
  }
  for (const file of lines(
    yield* git(root, ...quotePath, 'ls-files', '--others', '--exclude-standard', '--', '*.mdl'),
  )) {
    changed.set(file, undefined);
  }

  let failures = 0;
  for (const [file, basePath] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
    if (EXEMPT.some((pattern) => pattern.test(file))) {
      continue;
    }
    const after = yield* fs.readFileString(path.join(root, file));
    const before = basePath === undefined ? undefined : yield* git(root, 'show', `${base}:${basePath}`);
    const errors = [
      ...checkChangelogChange(before, after).filter((error) => waivers.length === 0 || error !== MISSING_DECISION),
      ...lintMdl(after)
        .filter(({ source }) => source === 'mdl/decision')
        .map(({ message }) => message),
    ];
    for (const error of errors) {
      yield* Console.log(`${file}: ${error}`);
    }
    failures += errors.length;
  }

  if (failures > 0) {
    yield* Console.log(
      `\n${failures} changelog error(s). Every spec change adds a decision - see .agents/skills/mdl/SKILL.md.`,
    );
    return yield* Effect.fail(new ChangelogCheckError({ context: { failures } }));
  }
  yield* Console.log(`OK: ${changed.size} changed .mdl file(s) checked against ${baseRef}.`);
});

const check = Command.make(
  'check',
  {
    base: Flag.String('base').pipe(
      Flag.withDescription('Ref to diff against, via its merge base with HEAD (env MDL_BASE_REF).'),
      Flag.withFallbackConfig(Config.String('MDL_BASE_REF')),
      Flag.withDefault(DEFAULT_BASE_REF),
    ),
  },
  Effect.fnUntraced(function* ({ base }) {
    const event = yield* Config.String('GITHUB_EVENT_NAME').pipe(Config.withDefault(''));
    yield* checkChangelog({ base, cwd: process.cwd(), event });
  }),
).pipe(
  Command.withDescription(
    'Fail when a changed .mdl spec adds no `## Changelog` decision or edits an existing one (waive with a `Spec-Changelog-Skip:` trailer).',
  ),
);

export const changelog = Command.make('changelog').pipe(
  Command.withDescription('Spec changelog tools.'),
  Command.withSubcommands([check]),
);
