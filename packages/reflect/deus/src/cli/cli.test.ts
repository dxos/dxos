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
import { ChangelogCheckError, LintError, QaLintError, checkChangelog, deus } from './index.ts';

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
    for (const name of ['changelog', 'lint', 'qa']) {
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
  const repo = (edit: (text: string) => string) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped();
      const spec = path.join(dir, 'spec.mdl');
      const original = yield* fs.readFileString(SAMPLE_SPEC);
      yield* fs.writeFileString(spec, original);
      yield* git(dir, 'init', '-q', '-b', 'main');
      yield* git(dir, 'add', '.');
      yield* git(dir, '-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', 'init');
      yield* fs.writeFileString(spec, edit(original));
      return dir;
    });

  const check = (edit: (text: string) => string) =>
    Effect.gen(function* () {
      const dir = yield* repo(edit);
      return yield* checkChangelog({ base: 'main', cwd: dir, event: '' }).pipe(Effect.exit);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer), Effect.runPromise);

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
