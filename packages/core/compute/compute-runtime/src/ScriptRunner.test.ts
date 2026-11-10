//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';

import * as ScriptRunner from './ScriptRunner.ts';

const KEY = DXN.make('com.example.operation.script');

/** A backend that answers with the code it was handed, so a test can see which one was picked. */
const echoRunner = (label: string): Operation.ScriptRunner => ({
  run: (request) =>
    Effect.succeed({
      output: `${label}:${Operation.isInlineScript(request.source) ? request.source.code : 'object'}`,
    }),
});

describe('ScriptRunner record form', () => {
  const script = Operation.makeScript({
    meta: { key: KEY, name: 'Inline Script' },
    source: Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Effect }),
  });

  test('an inline script round-trips through its registry record, dialect included', ({ expect }) => {
    const restored = ScriptRunner.deserialize(ScriptRunner.serialize(script));
    expect(restored && Operation.isScript(restored)).toBe(true);
    expect(restored?.source).toEqual(script.source);
    expect(restored?.meta.name).toBe('Inline Script');
  });

  test('a record of a compiled operation deserializes to no script', ({ expect }) => {
    const record = Operation.serialize(
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Compiled' } }),
    );
    expect(ScriptRunner.deserialize(record)).toBeUndefined();
  });
});

describe('ScriptRunner.resolveSource', () => {
  test('a snippet resolves to its own code and dialect', async ({ expect }) => {
    const resolved = await EffectEx.runPromise(
      ScriptRunner.resolveSource(Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Effect })),
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

describe('ScriptRunner.byDialect', () => {
  test('routes a request to the backend registered for its dialect', async ({ expect }) => {
    const runner = ScriptRunner.byDialect({ plain: echoRunner('plain'), effect: echoRunner('effect') });
    const result = await EffectEx.runPromise(
      // These backends answer from the request alone, so they are handed no process at all.
      runner.run({ source: Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Effect }) }),
    );
    expect(result.output).toBe('effect:print(1)');
  });

  test('fails a dialect no backend claims, naming the ones it serves', async ({ expect }) => {
    const runner = ScriptRunner.byDialect({ effect: echoRunner('effect') });
    const error = await EffectEx.runPromise(
      runner
        .run({ source: Operation.inlineScript('x', { dialect: Operation.ScriptDialects.Plain }) })
        .pipe(Effect.flip),
    );
    expect(error._tag).toBe('ScriptError');
    expect(error.dialect).toBe('plain');
    expect(error.message).toContain('effect');
  });
});
