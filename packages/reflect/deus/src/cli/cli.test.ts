//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import * as CliError from 'effect/cli/CliError';
import * as Command from 'effect/cli/Command';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import { describe, test } from 'vitest';

import { git } from './git.ts';
import {
  ChangelogCheckError,
  FeatureCheckError,
  LintError,
  QaLintError,
  ReviewCheckError,
  checkChangelog,
  configDependsOn,
  deriveStatus,
  deus,
} from './index.ts';

const FIXTURES = new URL('./__fixtures__/', import.meta.url).pathname;
const QA_LIST = `${FIXTURES}qa-list`;
const SAMPLE_SPEC = `${QA_LIST}/plugin-sample/spec/PLUGIN.mdl`;

/** Runs `deus <args>` and returns its exit and everything it printed. */
const run = (args: string[], env: Record<string, string> = {}) => {
  const output: string[] = [];
  const capture = (...values: ReadonlyArray<unknown>) => void output.push(values.join(' '));
  const console: Console.Console = { ...globalThis.console, log: capture, error: capture };
  return Command.runWith(deus, { version: 'test', renderErrors: false })(args).pipe(
    Effect.exit,
    Effect.map((exit) => ({ exit, output })),
    Effect.provideService(Console.Console, console),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env })),
    Effect.provide(NodeServices.layer),
    Effect.runPromise,
  );
};

const failure = (exit: Exit.Exit<unknown, unknown>): unknown =>
  Exit.isFailure(exit) ? exit.cause.reasons.find((reason) => reason._tag === 'Fail')?.error : undefined;

describe('deus command parsing', () => {
  test('lint requires at least one file', async ({ expect }) => {
    const { exit } = await run(['lint']);
    expect(CliError.isCliError(failure(exit))).toBe(true);
  });

  test('qa list takes at most two positionals', async ({ expect }) => {
    const { exit } = await run(['qa', 'list', 'markdown', 'QA-1', 'extra']);
    expect(CliError.isCliError(failure(exit))).toBe(true);
  });

  test('an unknown subcommand is a usage error', async ({ expect }) => {
    const { exit } = await run(['nope']);
    expect(CliError.isCliError(failure(exit))).toBe(true);
  });

  test('--help lists every subcommand', async ({ expect }) => {
    const { exit, output } = await run(['--help']);
    expect(Exit.isSuccess(exit)).toBe(true);
    const help = output.join('\n');
    for (const name of ['changelog', 'features', 'lint', 'qa', 'review']) {
      expect(help).toContain(name);
    }
  });
});

describe('deus lint', () => {
  test('a clean spec passes', async ({ expect }) => {
    const { exit } = await run(['lint', SAMPLE_SPEC]);
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  test('--only keeps one check and an error fails the run', async ({ expect }) => {
    const file = `${FIXTURES}bad-decision.mdl`;
    const { exit, output } = await run(['lint', '--only', 'mdl/decision', file]);
    expect(LintError.is(failure(exit))).toBe(true);
    expect(output.length).toBeGreaterThan(0);
    for (const line of output) {
      expect(line).toMatch(new RegExp(`^${file}:\\d+: error \\[mdl/decision\\]: `));
    }
  });
});

describe('deus lint references', () => {
  const dir = `${FIXTURES}lint-refs`;

  test('lint reports mdl/ref in a spec', async ({ expect }) => {
    const { exit, output } = await run(['lint', '--only', 'mdl/ref', `${dir}/SPEC.mdl`]);
    expect(LintError.is(failure(exit))).toBe(true);
    expect(output).toEqual([`${dir}/SPEC.mdl:7: error [mdl/ref]: Unknown spec \`org.dxos.fixture.nope\`.`]);
  });

  test('lint skips mdl/ref in review files', async ({ expect }) => {
    const { exit, output } = await run(['lint', `${dir}/SPEC.review.mdl`]);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(output).toEqual([]);
  });
});

describe('deus qa list', () => {
  test('lists the tests with their stage counts', async ({ expect }) => {
    const { exit, output } = await run(['qa', 'list', '--root', QA_LIST]);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(output).toEqual([
      ' 1. sample:QA-1  unverified   2 steps (1 before, 1 after)  Shows the greeting',
      '    plugin-sample/spec/PLUGIN.mdl  covers: F-1.1',
      ' 2. sample:QA-2  verified     1 steps (0 before, 0 after)  Hides the greeting',
      '    plugin-sample/spec/PLUGIN.mdl',
    ]);
  });

  test('<plugin> <testId> selects exactly one test', async ({ expect }) => {
    const { output } = await run(['qa', 'list', '--root', QA_LIST, '--json', 'plugin-sample', 'qa-2']);
    expect(JSON.parse(output.join('\n')).map(({ id }: { id: string }) => id)).toEqual(['QA-2']);
  });

  test('--tag resolves suite members in order and reports unresolved refs', async ({ expect }) => {
    const { output } = await run(['qa', 'list', '--root', QA_LIST, '--json', '--tag', 'nightly']);
    const rows: { plugin: string; id: string; status: string }[] = JSON.parse(output.join('\n'));
    expect(rows.map(({ plugin, id, status }) => `${plugin}:${id}:${status}`)).toEqual([
      'sample:QA-1:unverified',
      'sample:QA-2:verified',
      'other:QA-9:missing',
    ]);
  });

  test('--suites lists suites', async ({ expect }) => {
    const { output } = await run(['qa', 'list', '--root', QA_LIST, '--suites']);
    expect(output).toEqual([' 1. smoke   3 tests  Smoke tests', '    plugin-sample/spec/PLUGIN.mdl  tags: nightly']);
  });
});

describe('deus qa lint', () => {
  const root = `${FIXTURES}qa-lint`;

  test('reports unbound references and unsafe teardowns', async ({ expect }) => {
    const { exit, output } = await run(['qa', 'lint', '--root', root]);
    expect(QaLintError.is(failure(exit))).toBe(true);
    expect(output).toEqual([
      'packages/plugins/plugin-risky/PLUGIN.mdl  QA-1',
      '    L17  $given.document',
      '    L19  $orphan',
      '\n1 tests with unbound references; 2 references total',
      'packages/plugins/plugin-risky/PLUGIN.mdl  QA-2  L28  resolves by index',
      '\n1 teardown step(s) that could remove an object the run did not create',
    ]);
  });

  test('--check runs one lint', async ({ expect }) => {
    const { output } = await run(['qa', 'lint', '--root', root, '--check', 'teardown']);
    expect(output.join('\n')).not.toContain('unbound');
  });

  test('--check rejects an unknown lint', async ({ expect }) => {
    const { exit } = await run(['qa', 'lint', '--root', root, '--check', 'nope']);
    expect(CliError.isCliError(failure(exit))).toBe(true);
  });
});

describe('deus review', () => {
  const dir = `${FIXTURES}review`;

  test('items lists reqs in place of their feat, plus other reviewed blocks', async ({ expect }) => {
    const { exit, output } = await run(['review', 'items', `${dir}/SPEC.mdl`]);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(output.map((line) => line.split('\t').slice(0, 2).join(' '))).toEqual([
      'F-1.1 req',
      'F-1.2 req',
      'Greet op',
      'QA-1 test',
    ]);
  });

  test('check reports every broken verdict and each item without one', async ({ expect }) => {
    const { exit, output } = await run(['review', 'check', `${dir}/SPEC.review.mdl`]);
    expect(ReviewCheckError.is(failure(exit))).toBe(true);
    const errors = output.filter((line) => line.startsWith('error: '));
    expect(errors.map((line) => line.replace(/^error: .*?:\d+: /, ''))).toEqual([
      'F-1.2 is partial but has no note saying what is missing or different',
      'no declaration of noSuchSymbol in github:dxos/dxos/packages/reflect/deus/src/cli/review.ts (a mention is not evidence)',
      'Greet has status `shiny`; use one of done, untested, partial, diverged, missing',
      'key leaves the checkout: github:dxos/dxos/../outside.ts',
      'QA-1 has no verdict',
    ]);
    expect(output.at(-1)).toBe('3 verdicts for 4 items; 5 errors, 1 warnings.');
  });
});

describe('review dependsOn', () => {
  const dir = `${FIXTURES}review`;

  test('configDependsOn parses the array', ({ expect }) => {
    expect(configDependsOn('plugin: {\n  dependsOn: [\'a.b\', "c.d"],\n}')).toEqual(['a.b', 'c.d']);
    expect(configDependsOn('plugin: { dependsOn: [] }')).toEqual([]);
    expect(configDependsOn('plugin: {}')).toEqual([]);
    expect(configDependsOn("plugin: { key: 'x' }")).toEqual([]);
    expect(configDependsOn("export default { name: 'x' }")).toBeUndefined();
    expect(configDependsOn('plugin: { dependsOn: DEPS }')).toBeUndefined();
    expect(configDependsOn("plugin: { dependsOn: [...BASE, 'x'] }")).toBeUndefined();
    expect(configDependsOn("plugin: { dependsOn: ['a', B] }")).toBeUndefined();
    expect(
      configDependsOn(
        "plugin: {\n  // dependsOn: ['old'],\n  dependsOn: [\n    'a',\n    // 'x',\n    'b', /* 'y' */\n  ],\n}",
      ),
    ).toEqual(['a', 'b']);
  });

  test('review check fails on a dependsOn mismatch judged done', async ({ expect }) => {
    const { exit, output } = await run(['review', 'check', `${dir}/plugin-deps-mismatch/PLUGIN.review.mdl`]);
    expect(ReviewCheckError.is(failure(exit))).toBe(true);
    expect(
      output.filter((line) => line.startsWith('error: ')).map((line) => line.replace(/^error: .*?:\d+: /, '')),
    ).toEqual([
      'SamplePlugin dependsOn [org.example.plugin.a] differs from dx.config.ts [org.example.plugin.a, org.example.plugin.b]; judge it diverged',
    ]);
  });

  test('review check treats a config plugin without dependsOn as empty', async ({ expect }) => {
    const { exit, output } = await run(['review', 'check', `${dir}/plugin-deps-empty/PLUGIN.review.mdl`]);
    expect(ReviewCheckError.is(failure(exit))).toBe(true);
    expect(
      output.filter((line) => line.startsWith('error: ')).map((line) => line.replace(/^error: .*?:\d+: /, '')),
    ).toEqual(['SamplePlugin dependsOn [org.example.plugin.a] differs from dx.config.ts []; judge it diverged']);
  });

  test('review check passes when the mismatch is judged diverged, or the sets match', async ({ expect }) => {
    for (const name of ['plugin-deps-diverged', 'plugin-deps', 'plugin-deps-noplugin']) {
      const { exit, output } = await run(['review', 'check', `${dir}/${name}/PLUGIN.review.mdl`]);
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(output.at(-1)).toMatch(/^1 verdicts for 1 items; 0 errors, /);
    }
  });
});

describe('deus features', () => {
  const dir = `${FIXTURES}features`;
  const map = `${dir}/FEATURES.mdl`;
  /** Drops the `<map>:<line>: ` prefix so assertions read as the message. */
  const message = (line: string) => line.replace(/^(warning|error): .*?\.mdl(?::\d+)?: /, '$1: ');

  test('status follows the verdicts of the cited items', ({ expect }) => {
    expect(deriveStatus(['done', 'done'])).toBe('operational');
    expect(deriveStatus(['done', 'untested'])).toBe('prototype');
    expect(deriveStatus(['missing', 'missing'])).toBe('planned');
    expect(deriveStatus(['done', 'missing'])).toBe('in-progress');
    expect(deriveStatus(['diverged'])).toBe('in-progress');
    expect(deriveStatus(['done', undefined])).toBe('unreviewed');
    expect(deriveStatus([])).toBe('unreviewed');
  });

  test('check derives each status and reports what is wrong or out of step', async ({ expect }) => {
    const { exit, output } = await run(['features', 'check', '--map', map]);
    expect(FeatureCheckError.is(failure(exit))).toBe(true);
    expect(output.filter((line) => !line.startsWith('warning') && !line.startsWith('error'))).toEqual([
      'listing\toperational\toperational\t2/2 done',
      'greeting\toperational\tprototype\t0/1 done',
      'listing-next\tplanned\tplanned\t0/1 done',
      'export\tin-progress\tplanned\t0/1 done',
      'ghost\tshiny\tunreviewed\t0/0 done',
      '5 features; 4 errors, 4 warnings.',
    ]);
    expect(output.filter((line) => /^(warning|error)/.test(line)).map(message)).toEqual([
      expect.stringMatching(/^warning: listing: the review of .*SPEC\.mdl names a commit not in this clone$/),
      'warning: greeting: marked operational but its reviews say prototype',
      'warning: export: marked in-progress but its reviews say planned',
      'warning: export: partly built with no work planned: no TASKS.md beside its spec has a `## export` section',
      'error: ghost: status `shiny`; use one of planned, in-progress, prototype, operational, failing',
      'error: export: depends on unknown feature nobody',
      expect.stringMatching(/^error: ghost: .*SPEC\.mdl#F-9 names no reviewable item of the spec$/),
      expect.stringMatching(/^error: ghost: spec not found: .*NOPE\.mdl$/),
    ]);
  });

  test('check rejects a dependency cycle', async ({ expect }) => {
    const { exit, output } = await run(['features', 'check', '--map', `${dir}/CYCLE.mdl`]);
    expect(FeatureCheckError.is(failure(exit))).toBe(true);
    expect(output.filter((line) => line.startsWith('error')).map(message)).toEqual([
      'error: dependency cycle: first -> second -> first',
    ]);
  });

  test('tasks lists the open items of one feature with their verdicts', async ({ expect }) => {
    const { exit, output } = await run(['features', 'tasks', '--map', map, 'export']);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(output.filter((line) => line.startsWith('- ['))).toEqual([
      '- [ ] F-2.1: The CLI exports items as JSON. (missing: No exporter exists.)',
    ]);
  });

  test('tasks fails for a feature that is not on the map', async ({ expect }) => {
    const { exit } = await run(['features', 'tasks', '--map', map, 'nope']);
    expect(FeatureCheckError.is(failure(exit))).toBe(true);
  });
});

describe('deus changelog check', () => {
  const DECISION = [
    '',
    '```mdl',
    'decision D-2: The greeting is optional.',
    '  date: 2026-10-23',
    '  by: user:dmaretskyi',
    '  affects: [F-1]',
    '```',
    '',
  ].join('\n');

  /** A scratch repository whose `main` holds the fixture spec, with `spec.mdl` then edited by `edit`. */
  const repo = Effect.fnUntraced(function* (edit: (text: string) => string) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* fs.makeTempDirectoryScoped();
    const spec = path.join(dir, 'spec.mdl');
    const original = yield* fs.readFileString(SAMPLE_SPEC);
    yield* fs.writeFileString(spec, original);
    yield* git(dir, 'init', '-q', '-b', 'main');
    yield* git(dir, 'add', '.');
    // Pinned so a global identity or `commit.gpgsign` cannot change or block the scratch commit.
    const identity = ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false'];
    yield* git(dir, ...identity, 'commit', '-q', '-m', 'init');
    yield* fs.writeFileString(spec, edit(original));
    return dir;
  });

  const check = (edit: (text: string) => string) =>
    repo(edit).pipe(
      Effect.flatMap((dir) => checkChangelog({ base: 'main', cwd: dir, event: '' })),
      Effect.exit,
      Effect.scoped,
      Effect.provide(NodeServices.layer),
      Effect.runPromise,
    );

  test('a spec change without a decision fails', async ({ expect }) => {
    const exit = await check((text) => text.replace('shows a greeting.', 'shows a friendly greeting.'));
    expect(ChangelogCheckError.is(failure(exit))).toBe(true);
  });

  test('a spec change with a new decision passes', async ({ expect }) => {
    const exit = await check((text) => text.replace('shows a greeting.', 'shows a friendly greeting.') + DECISION);
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  test('a non-pull-request CI event skips the check', async ({ expect }) => {
    const { exit, output } = await run(['changelog', 'check', '--base', 'no-such-ref'], { GITHUB_EVENT_NAME: 'push' });
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(output).toEqual(['Skipping on `push` — the changelog check is diff-based.']);
  });
});
