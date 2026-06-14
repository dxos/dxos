//
// Copyright 2025 DXOS.org
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

import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { dbg } from '@dxos/log';

import * as AiService from '../../AiService';
import { AiServiceTestingPreset } from '../test-layers';
import { TestingToolkit, testingLayer } from '../toolkit';
import * as MemoizedAiService from './MemoizedAiService';
import * as MemoizedLanguageModel from './MemoizedLanguageModel';

// Workaround: @effect/ai-anthropic v0.26.0 declares AnthropicWebSearch with
// parameters: EmptyParams, but the API now sends { query: "..." } in tool_use.input,
// causing a schema decode failure. This local definition uses the correct schema.
const AnthropicWebSearch = Tool.providerDefined({
  id: 'anthropic.web_search_20250305' as `${string}.${string}`,
  toolkitName: 'AnthropicWebSearch',
  providerName: 'web_search',
  args: {},
  parameters: { query: Schema.optional(Schema.String) },
  success: Schema.Unknown,
})({});

const DateToolkit = Toolkit.make(
  Tool.make('get-date', {
    description: 'Get the current date',
    success: Schema.DateFromString,
  }),
);

const layerTest = DateToolkit.toLayer({
  'get-date': Effect.fnUntraced(function* () {
    return new Date('2025-10-01');
  }),
});

const TestLayer = Layer.mergeAll(testingLayer, layerTest, AiService.model('ai.claude.model.claude-sonnet-4-0')).pipe(
  Layer.provideMerge(MemoizedAiService.layerTest()),
  Layer.provide(AiServiceTestingPreset('edge-remote')),
);

class TestObjectReadToolkit extends Toolkit.make(
  Tool.make('read-object', {
    description: 'Read an object',
    parameters: {
      objectId: EntityId,
    },
  }),
) {
  static layer = TestObjectReadToolkit.toLayer({
    'read-object': Effect.fnUntraced(function* (params) {
      return params.objectId;
    }),
  });
}

describe('memoization', () => {
  it.effect(
    'context paths',
    Effect.fnUntraced(function* (ctx) {
      const filepath = ctx.task.file.filepath;
      expect(filepath.endsWith('memoization.test.ts')).toBe(true);
    }),
  );

  it.effect(
    'generate a poem',
    Effect.fnUntraced(
      function* (_) {
        yield* LanguageModel.generateText({
          prompt: 'Write me a poem!',
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tools',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('Add 47 + 23');

        while (true) {
          const stream = chat.streamText({
            prompt: Prompt.empty,
            toolkit: TestingToolkit,
          });
          yield* stream.pipe(
            Stream.runForEach((_part) => {
              // console.log(part);
              return Effect.void;
            }),
          );

          const lastMessage = (yield* chat.history).content.at(-1);
          if (lastMessage?.role === 'tool') {
            continue;
          } else {
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tools with encoding',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('What is the current date?');

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* DateToolkit,
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'provider-defined tool',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('Who is the current pope?');

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* Toolkit.make(AnthropicWebSearch),
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('dynamic value matching', () => {
  const { SPACE_ID_PATTERN, ENTITY_ID_PATTERN, __testing } = MemoizedLanguageModel;

  // Two structurally identical prompts that differ only in the (run-specific) space key.
  const SPACE_A = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';
  const SPACE_B = 'BZZ34QRC2FEWCSAMRP4RZL65LWJ7352CK';
  const OBJECT_ID = '01J00J9B45YHYSGZQTQMSKMGJ6';

  const promptWith = (spaceId: string) => [
    {
      role: 'user',
      content: [{ type: 'text', text: `Create an object in space echo://${spaceId}` }],
    },
    {
      role: 'tool',
      content: [{ type: 'tool-result', result: { uri: `echo://${spaceId}/${OBJECT_ID}` } }],
    },
  ];

  test('canonicalized prompts match across differing space keys', ({ expect }) => {
    const a = __testing.normalizeForMatching(promptWith(SPACE_A), [SPACE_ID_PATTERN]);
    const b = __testing.normalizeForMatching(promptWith(SPACE_B), [SPACE_ID_PATTERN]);
    expect(a).toEqual(b);
  });

  test('without patterns the differing space keys do not match (opt-in)', ({ expect }) => {
    const a = __testing.normalizeForMatching(promptWith(SPACE_A), []);
    const b = __testing.normalizeForMatching(promptWith(SPACE_B), []);
    expect(a).not.toEqual(b);
  });

  test('prompts with a different count of dynamic values do not match', ({ expect }) => {
    const single = __testing.normalizeForMatching([{ text: `echo://${SPACE_A}` }], [SPACE_ID_PATTERN]);
    const pair = __testing.normalizeForMatching(
      [{ text: `echo://${SPACE_A} and echo://${SPACE_B}` }],
      [SPACE_ID_PATTERN],
    );
    expect(single).not.toEqual(pair);
  });

  test('remaps stored response space keys to the live prompt values', ({ expect }) => {
    const storedResponse = [
      { type: 'tool-call', input: { uri: `echo://${SPACE_A}/${OBJECT_ID}` } },
      { type: 'text', text: `Created object in echo://${SPACE_A}.` },
    ];

    const remapped = __testing.remapResponse(promptWith(SPACE_A), storedResponse, promptWith(SPACE_B), [
      SPACE_ID_PATTERN,
    ]);

    const serialized = JSON.stringify(remapped);
    expect(serialized).toContain(SPACE_B);
    expect(serialized).not.toContain(SPACE_A);
    // Stable object id is preserved.
    expect(serialized).toContain(OBJECT_ID);
  });

  test('space-key pattern takes precedence over the entity-id pattern (no partial overlap)', ({ expect }) => {
    // The space key is base-32 and could contain a 26-char window matching the ULID pattern; the
    // longer space-key alternative must win so the whole key is treated as a single token.
    const matcher = __testing.buildDynamicMatcher([SPACE_ID_PATTERN, ENTITY_ID_PATTERN]);
    expect(matcher).toBeDefined();
    if (!matcher) {
      return;
    }
    const tokens = [...`echo://${SPACE_A}/${OBJECT_ID}`.matchAll(matcher)].map((match) => match[0]);
    expect(tokens).toEqual([SPACE_A, OBJECT_ID]);
  });

  it.effect(
    'works with tool calsl',
    Effect.fnUntraced(
      function* (_) {
        const id = EntityId.random(); // Random every run. Substituted in the memoization layer.
        dbg(id);
        const chat = yield* Chat.fromPrompt(
          `What does object ${id} contain? You must use the read-object tool to answer this question.`,
        );

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* TestObjectReadToolkit,
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(
        Layer.mergeAll(TestObjectReadToolkit.layer, AiService.model('ai.claude.model.claude-sonnet-4-0')).pipe(
          Layer.provideMerge(
            MemoizedAiService.layerTest({
              dynamicValuePatterns: [MemoizedLanguageModel.ENTITY_ID_PATTERN],
            }),
          ),
          Layer.provide(AiServiceTestingPreset('edge-remote')),
        ),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});
