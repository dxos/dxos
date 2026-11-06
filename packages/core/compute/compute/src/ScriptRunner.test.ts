//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';

import * as Operation from './Operation.ts';
import * as ScriptRunner from './ScriptRunner.ts';
import * as Script from './types/Script.ts';

/** A runner that answers with the code it was handed, so a test can see which one was picked. */
const echoRunner = (label: string): ScriptRunner.Runner => ({
  run: (request) =>
    Effect.succeed({
      output: `${label}:${Operation.isInlineScript(request.source) ? request.source.code : 'object'}`,
    }),
});

describe('ScriptRunner.byDialect', () => {
  test('routes a request to the runner registered for its dialect', async ({ expect }) => {
    const runner = ScriptRunner.byDialect({ plain: echoRunner('plain'), effect: echoRunner('effect') });
    const result = await EffectEx.runPromise(
      runner.run({ source: Operation.inlineScript('print(1)', Operation.Dialects.Effect) }),
    );
    expect(result.output).toBe('effect:print(1)');
  });

  test('fails a dialect no backend claims, naming the ones it serves', async ({ expect }) => {
    const runner = ScriptRunner.byDialect({ effect: echoRunner('effect') });
    const error = await EffectEx.runPromise(
      runner.run({ source: Operation.inlineScript('x', Operation.Dialects.Plain) }).pipe(Effect.flip),
    );
    expect(error._tag).toBe('ScriptRunnerError');
    expect(error.dialect).toBe('plain');
    expect(error.message).toContain('effect');
  });

  test('an object source is served by the TypeScript runner', async ({ expect }) => {
    const runner = ScriptRunner.byDialect({ typescript: echoRunner('ts') });
    const result = await EffectEx.runPromise(runner.run({ source: Operation.scriptRef(Ref.make(Script.make())) }));
    expect(result.output).toBe('ts:object');
  });
});

describe('ScriptRunner.run', () => {
  test('runs through the ambient runner', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      ScriptRunner.run({ source: Operation.inlineScript('print(1)', Operation.Dialects.Plain) }).pipe(
        Effect.provide(ScriptRunner.layer(echoRunner('ambient'))),
      ),
    );
    expect(result.output).toBe('ambient:print(1)');
  });
});

describe('ScriptRunner.requestOf', () => {
  test('carries the operation source, its timeout and the input', ({ expect }) => {
    const operation = Operation.makeScript({
      meta: { key: DXN.make('com.example.script'), name: 'Example' },
      source: Operation.inlineScript('print(input)', Operation.Dialects.Effect),
      timeout: 5_000,
    });
    expect(ScriptRunner.requestOf(operation, { a: 1 }, { spaceId: 'SPACE' })).toEqual({
      source: operation.source,
      input: { a: 1 },
      timeoutMs: 5_000,
      spaceId: 'SPACE',
    });
  });

  test('omits an absent input rather than sending undefined', ({ expect }) => {
    const operation = Operation.makeScript({
      meta: { key: DXN.make('com.example.script') },
      source: Operation.inlineScript('print(1)', Operation.Dialects.Plain),
    });
    expect(ScriptRunner.requestOf(operation)).toEqual({ source: operation.source });
  });
});

describe('ScriptRunner.resolveSource', () => {
  test('a snippet resolves to its own code and dialect', async ({ expect }) => {
    const resolved = await EffectEx.runPromise(
      ScriptRunner.resolveSource(Operation.inlineScript('print(1)', Operation.Dialects.Effect)),
    );
    expect(resolved).toEqual({ code: 'print(1)', dialect: 'effect' });
  });

  test('an object source resolves to the text of the script it points at', async ({ expect }) => {
    const resolved = await EffectEx.runPromise(
      ScriptRunner.resolveSource(Operation.scriptRef(Ref.make(Script.make({ source: 'const x = 1;' })))),
    );
    expect(resolved).toEqual({ code: 'const x = 1;', dialect: 'typescript' });
  });
});
