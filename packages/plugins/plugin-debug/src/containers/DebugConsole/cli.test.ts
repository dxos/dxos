//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';
import * as Stdio from 'effect/Stdio';
import * as Terminal from 'effect/Terminal';
import * as Command from 'effect/unstable/cli/Command';
import * as ChildProcessSpawner from 'effect/unstable/process/ChildProcessSpawner';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import * as SupportOperation from '@dxos/plugin-support/SupportOperation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { createDebugCli } from './cli.ts';

const setup = async () => {
  const filed: unknown[] = [];
  // The real definition, so its input schema decides what the console may send; the handler is
  // stubbed because the real one files a Linear issue.
  const handler = Operation.withHandler(SupportOperation.SubmitIssue, (input) =>
    Effect.sync(() => {
      filed.push(input);
      return {
        reportId: 'report-1',
        issueId: 'issue-1',
        issueIdentifier: 'DX-1',
        issueUrl: 'https://linear.app/dxos/issue/DX-1',
      };
    }),
  );
  const SupportStub = Plugin.make(
    Plugin.define(Plugin.makeMeta({ key: DXN.make('com.example.plugin.supportStub'), name: 'Support stub' })).pipe(
      Plugin.addModule({
        id: 'operations',
        activatesOn: ActivationEvents.Startup,
        provides: [Capabilities.OperationHandler],
        activate: Effect.fnUntraced(function* () {
          return Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(handler));
        }),
      }),
    ),
  );
  const harness = await createComposerTestApp({ plugins: [SupportStub()] });
  const printed: string[] = [];
  const cli = createDebugCli(harness.manager, { onResult: (text) => printed.push(text) });
  const unavailable = Effect.die(new Error('Unavailable in tests.'));
  const environment = Layer.mergeAll(
    FileSystem.layerNoop({}),
    Path.layer,
    Stdio.layerTest({}),
    Layer.succeed(Terminal.Terminal)(
      Terminal.make({
        columns: Effect.succeed(80),
        rows: Effect.succeed(24),
        readInput: unavailable,
        readLine: unavailable,
        display: () => Effect.void,
      }),
    ),
    Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(ChildProcessSpawner.make(() => unavailable)),
  );
  const run = (args: string[]) =>
    EffectEx.runPromise(
      Command.runWith(cli.command, { version: '0.0.0' })(args).pipe(
        Effect.provide(Layer.merge(cli.layer, environment)),
        Effect.flip,
        Effect.map((error) => String(error)),
        Effect.catch(() => Effect.succeed(undefined)),
      ),
    );
  return { harness, filed, printed, run };
};

describe('debug console report', () => {
  test('refuses a missing body before invoking the operation', async ({ expect }) => {
    const { harness, filed, run } = await setup();
    await using _harness = harness;

    const error = await run(['report', 'App', 'keeps', 'reloading']);
    expect(error).toContain('Issue body must not be empty');
    expect(filed).toHaveLength(0);
  });

  test('refuses a whitespace-only body before invoking the operation', async ({ expect }) => {
    const { harness, filed, run } = await setup();
    await using _harness = harness;

    const error = await run(['report', 'App keeps reloading', '--body', '   ']);
    expect(error).toContain('Issue body must not be empty');
    expect(filed).toHaveLength(0);
  });

  test('files the report when a body is given', async ({ expect }) => {
    const { harness, filed, printed, run } = await setup();
    await using _harness = harness;

    const error = await run(['report', 'App keeps reloading', '--body', 'Reloads every few seconds.']);
    expect(error).toBeUndefined();
    expect(filed).toMatchObject([
      {
        report: {
          title: 'App keeps reloading',
          body: 'Reloads every few seconds.',
          labels: ['Composer Feedback Form'],
        },
      },
    ]);
    expect(printed).toEqual(['DX-1 https://linear.app/dxos/issue/DX-1']);
  });
});
