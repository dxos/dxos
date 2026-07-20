//
// Copyright 2026 DXOS.org
//

import * as Chat from '@effect/ai/Chat';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import * as AiService from '../../AiService';
import { generateParts, streamParts } from './parts';
import * as ScriptedAiService from './ScriptedAiService';

const OPUS = 'com.anthropic.model.claude-opus-4-8.default';
const SONNET = 'com.anthropic.model.claude-sonnet-4-6.default';

const scriptedLayer = (script: ScriptedAiService.Script, model = OPUS) =>
  AiService.model(model).pipe(Layer.provideMerge(ScriptedAiService.layer(script)));

class AddToolkit extends Toolkit.make(
  Tool.make('add', {
    description: 'Add two numbers',
    parameters: { a: Schema.Number, b: Schema.Number },
    success: Schema.Number,
  }),
) {
  static calls: Array<{ a: number; b: number }> = [];
  static layer = AddToolkit.toLayer({
    add: Effect.fnUntraced(function* ({ a, b }) {
      AddToolkit.calls.push({ a, b });
      return a + b;
    }),
  });
}

describe('scripted part synthesis', () => {
  test('streaming text turn emits response-metadata, text-start/delta/end, finish', () => {
    const parts = streamParts({ text: 'hello', tools: [], reason: 'stop' }, { responseId: 'r', modelId: 'm' });
    expect(parts.map((part) => part.type)).toEqual([
      'response-metadata',
      'text-start',
      'text-delta',
      'text-end',
      'finish',
    ]);
    expect(parts.find((part) => part.type === 'text-delta')).toMatchObject({ delta: 'hello' });
    expect(parts.at(-1)).toMatchObject({ type: 'finish', reason: 'stop' });
  });

  test('streaming tool-call turn emits raw tool-params-* AND a resolved tool-call', () => {
    const parts = streamParts(
      { tools: [{ id: 'tc-0', name: 'add', inputJson: '{"a":1,"b":2}' }], reason: 'tool-calls' },
      { responseId: 'r', modelId: 'm' },
    );
    expect(parts.map((part) => part.type)).toEqual([
      'response-metadata',
      'tool-params-start',
      'tool-params-delta',
      'tool-params-end',
      'tool-call',
      'finish',
    ]);
    expect(parts.find((part) => part.type === 'tool-params-delta')).toMatchObject({ delta: '{"a":1,"b":2}' });
    expect(parts.find((part) => part.type === 'tool-call')).toMatchObject({ name: 'add', params: { a: 1, b: 2 } });
  });

  test('non-streaming text turn emits a single text part', () => {
    const parts = generateParts({ text: 'ack', tools: [], reason: 'stop' }, { responseId: 'r', modelId: 'm' });
    expect(parts.map((part) => part.type)).toEqual(['response-metadata', 'text', 'finish']);
  });

  test('non-streaming tool call emits a resolved tool-call part', () => {
    const parts = generateParts(
      { tools: [{ id: 'tc-0', name: 'add', inputJson: '{"a":1}' }], reason: 'tool-calls' },
      { responseId: 'r', modelId: 'm' },
    );
    expect(parts.map((part) => part.type)).toEqual(['response-metadata', 'tool-call', 'finish']);
    expect(parts.find((part) => part.type === 'tool-call')).toMatchObject({ name: 'add', params: { a: 1 } });
  });
});

describe('scripted model', () => {
  it.effect(
    'replays a text turn',
    Effect.fnUntraced(
      function* () {
        const response = yield* LanguageModel.generateText({ prompt: 'Say ack.' });
        expect(response.text).toBe('ack');
      },
      Effect.provide(scriptedLayer({ models: { opus: { generate: [ScriptedAiService.text('ack')] } } })),
    ),
  );

  it.effect(
    'executes a scripted tool call, then finishes',
    Effect.fnUntraced(
      function* () {
        AddToolkit.calls = [];
        const toolkit = yield* AddToolkit;
        const chat = yield* Chat.fromPrompt('Add 47 and 23.');
        let text = '';
        while (true) {
          yield* chat.streamText({ prompt: Prompt.empty, toolkit }).pipe(
            Stream.runForEach((part) => {
              if (part.type === 'text-delta') {
                text += part.delta;
              }
              return Effect.void;
            }),
          );
          const last = (yield* chat.history).content.at(-1);
          if (last?.role === 'tool') {
            continue;
          }
          break;
        }
        expect(AddToolkit.calls).toEqual([{ a: 47, b: 23 }]);
        expect(text).toContain('70');
      },
      Effect.provide(
        AddToolkit.layer.pipe(
          Layer.provideMerge(
            scriptedLayer([ScriptedAiService.toolCall('add', { a: 47, b: 23 }), ScriptedAiService.text('The answer is 70.')]),
          ),
        ),
      ),
    ),
  );

  it.effect(
    'isolates cursors per (model, stream) bucket',
    Effect.fnUntraced(
      function* () {
        const opus = yield* LanguageModel.generateText({ prompt: 'x' }).pipe(
          Effect.provide(scriptedLayer({ models: { opus: { generate: [ScriptedAiService.text('from-opus')] }, sonnet: { generate: [ScriptedAiService.text('from-sonnet')] } }, turns: [] }, OPUS)),
        );
        const sonnet = yield* LanguageModel.generateText({ prompt: 'x' }).pipe(
          Effect.provide(scriptedLayer({ models: { opus: { generate: [ScriptedAiService.text('from-opus')] }, sonnet: { generate: [ScriptedAiService.text('from-sonnet')] } }, turns: [] }, SONNET)),
        );
        expect(opus.text).toBe('from-opus');
        expect(sonnet.text).toBe('from-sonnet');
      },
    ),
  );

  it.effect(
    'dies with a diagnostic when the script is exhausted',
    Effect.fnUntraced(function* () {
      const result = yield* LanguageModel.generateText({ prompt: 'x' }).pipe(
        Effect.provide(scriptedLayer({ models: { opus: { generate: [] } } })),
        Effect.exit,
      );
      expect(result._tag).toBe('Failure');
    }),
  );

  it.effect(
    'dies when a turn guard rejects',
    Effect.fnUntraced(function* () {
      const result = yield* LanguageModel.generateText({ prompt: 'x' }).pipe(
        Effect.provide(
          scriptedLayer({ models: { opus: { generate: [ScriptedAiService.text('never', { when: () => false })] } } }),
        ),
        Effect.exit,
      );
      expect(result._tag).toBe('Failure');
    }),
  );
});
