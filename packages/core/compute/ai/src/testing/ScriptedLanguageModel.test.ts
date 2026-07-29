//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as ScriptedLanguageModel from './ScriptedLanguageModel';

const { text, toolCall, scriptedLanguageModelLayer, __testing } = ScriptedLanguageModel;

describe('ScriptedLanguageModel', () => {
  describe('encoders', () => {
    test('encodes a text turn as streamed deltas ending in stop', ({ expect }) => {
      const parts = __testing.encodeStreamTurn([text('Hello')], 0, 'stop');
      expect(parts.map((part) => part.type)).toEqual([
        'response-metadata',
        'text-start',
        'text-delta',
        'text-end',
        'finish',
      ]);
      expect(parts.find((part) => part.type === 'text-delta')).toMatchObject({ delta: 'Hello' });
      expect(parts.find((part) => part.type === 'finish')).toMatchObject({ reason: 'stop' });
    });

    test('encodes a tool call turn with JSON-serialized input and deterministic id', ({ expect }) => {
      const parts = __testing.encodeStreamTurn([toolCall('Calculator', { input: '2 + 2' })], 1, 'tool-calls');
      expect(parts.map((part) => part.type)).toEqual([
        'response-metadata',
        'tool-params-start',
        'tool-params-delta',
        'tool-params-end',
        'finish',
      ]);
      expect(parts.find((part) => part.type === 'tool-params-start')).toMatchObject({
        name: 'Calculator',
        id: 'toolu_1_0',
      });
      expect(parts.find((part) => part.type === 'tool-params-delta')).toMatchObject({
        delta: JSON.stringify({ input: '2 + 2' }),
      });
    });

    test('encodes an aggregated (non-streamed) tool call', ({ expect }) => {
      const parts = __testing.encodeTurn([toolCall('Calculator', { input: '2 + 2' }, 'call-1')], 0, 'tool-calls');
      expect(parts.map((part) => part.type)).toEqual(['response-metadata', 'tool-call', 'finish']);
      expect(parts.find((part) => part.type === 'tool-call')).toMatchObject({
        id: 'call-1',
        name: 'Calculator',
        params: { input: '2 + 2' },
      });
    });

    test('infers the finish reason from the parts', ({ expect }) => {
      expect(__testing.finishReasonFor([text('hi')])).toEqual('stop');
      expect(__testing.finishReasonFor([toolCall('t', {})])).toEqual('tool-calls');
    });
  });

  it.effect(
    'replays turns sequentially and fails once exhausted',
    Effect.fnUntraced(
      function* ({ expect }) {
        const first = yield* LanguageModel.generateText({ prompt: 'ignored' });
        expect(first.text).toEqual('one');

        const second = yield* LanguageModel.generateText({ prompt: 'ignored' });
        expect(second.text).toEqual('two');

        const exit = yield* LanguageModel.generateText({ prompt: 'ignored' }).pipe(Effect.exit);
        expect(exit._tag).toEqual('Failure');
      },
      Effect.provide(scriptedLanguageModelLayer([{ parts: [text('one')] }, { parts: [text('two')] }])),
    ),
  );
});
