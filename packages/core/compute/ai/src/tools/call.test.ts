//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { type ContentBlock } from '@dxos/types';

import { callTool } from './call.ts';

const EchoToolkit = Toolkit.make(
  Tool.make('echo', {
    description: 'Echoes its argument',
    parameters: Schema.Struct({ value: Schema.String }),
    success: Schema.String,
  }),
);

/** Records whether the handler ran, so "never invoked" is asserted rather than inferred. */
const makeToolkit = () => {
  const calls: string[] = [];
  const handled = EchoToolkit.toLayer({
    echo: Effect.fn(function* ({ value }) {
      calls.push(value);
      return value;
    }),
  });
  return { calls, toolkit: EchoToolkit.pipe(Effect.provide(handled)) };
};

const makeToolCall = (input: string): ContentBlock.ToolCall => ({
  _tag: 'toolCall',
  toolCallId: 'call_1',
  name: 'echo',
  input,
  providerExecuted: false,
});

describe('callTool', () => {
  it.effect(
    'reports unparseable input as a tool error instead of failing',
    Effect.fn(function* ({ expect }) {
      const { calls, toolkit } = makeToolkit();

      // The shape the model produced in the field: an unquoted URI inside the JSON object.
      const result = yield* callTool(yield* toolkit, makeToolCall('{"objects": echo://BPB}'));

      // A failure here would take down the whole turn; the model needs a result it can retry from.
      expect(result.toolCallId).toEqual('call_1');
      expect(result.error).toContain('Invalid JSON arguments');
      expect(result.error).toContain('Retry');
      // The arguments never decoded, so the handler must not have run with partial input.
      expect(calls).toEqual([]);
    }),
  );

  it.effect(
    'invokes the handler when the input parses',
    Effect.fn(function* ({ expect }) {
      const { calls, toolkit } = makeToolkit();

      const result = yield* callTool(yield* toolkit, makeToolCall('{"value":"hello"}'));

      expect(result.error).toBeUndefined();
      expect(calls).toEqual(['hello']);
    }),
  );
});
