//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';

import * as Operation from './Operation.ts';
import * as ScriptRunner from './ScriptRunner.ts';
import * as Script from './types/Script.ts';

const KEY = DXN.make('com.example.operation.script');

/** A backend that answers with the code it was handed, so a test can see which one was picked. */
const echoRunner = (label: string): Operation.ScriptRunner => ({
  run: (request) =>
    Effect.succeed({
      output: `${label}:${Operation.isInlineScript(request.source) ? request.source.code : 'object'}`,
    }),
});

describe('script operations', () => {
  const script = Operation.makeScript({
    meta: { key: KEY, name: 'Inline Script' },
    source: Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Effect }),
  });

  test('a script operation is an operation, which is what lets `invoke` take it', ({ expect }) => {
    expect(Operation.isOperationDefinition(script)).toBe(true);
    expect(Operation.isScript(script)).toBe(true);
    // It carries no handler and is not a durable operation: the runtime runs it.
    expect(Operation.isOperationWithHandler(script)).toBe(false);
    expect(Operation.isDurable(script)).toBe(false);
  });

  test('its output is the run result, so an invoking caller reads what the script printed', ({ expect }) => {
    expect(Schema.decodeUnknownSync(Schema.toType(script.output))({ output: 'hi' })).toEqual({ output: 'hi' });
  });

  test('an operation that declares its own output keeps it', ({ expect }) => {
    const typed = Operation.makeScript({
      meta: { key: KEY },
      source: Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Plain }),
      output: Schema.Number,
    });
    expect(Schema.decodeUnknownSync(Schema.toType(typed.output))(3)).toBe(3);
  });

  test('an inline source carries its dialect; an object source is TypeScript', ({ expect }) => {
    expect(Operation.isInlineScript(script.source)).toBe(true);
    expect(Operation.scriptDialectOf(script.source)).toBe('effect');
    expect(Operation.scriptDialectOf(Operation.scriptRef(Ref.make(Script.make())))).toBe('typescript');
    expect(Operation.isScriptDialect('effect')).toBe(true);
    expect(Operation.isScriptDialect('cobol')).toBe(false);
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

describe('Operation.scriptRequest', () => {
  test('carries the operation source, its timeout and the input', ({ expect }) => {
    const operation = Operation.makeScript({
      meta: { key: KEY, name: 'Example' },
      source: Operation.inlineScript('print(input)', { dialect: Operation.ScriptDialects.Effect }),
      timeout: 5_000,
    });
    expect(Operation.scriptRequest(operation, { a: 1 }, { spaceId: 'SPACE' })).toEqual({
      source: operation.source,
      input: { a: 1 },
      timeoutMs: 5_000,
      spaceId: 'SPACE',
    });
  });

  test('omits an absent input rather than sending undefined', ({ expect }) => {
    const operation = Operation.makeScript({
      meta: { key: KEY },
      source: Operation.inlineScript('print(1)', { dialect: Operation.ScriptDialects.Plain }),
    });
    expect(Operation.scriptRequest(operation)).toEqual({ source: operation.source });
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
