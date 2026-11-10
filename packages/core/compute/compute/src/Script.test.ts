//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as Operation from './Operation.ts';
import * as Script from './types/Script.ts';

const KEY = DXN.make('com.example.operation.script');

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
