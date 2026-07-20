//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { ScriptedAiService } from '@dxos/ai/testing';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { DXN, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing';

// Define a calendar event artifact schema.
class CalendarEvent extends Type.makeObject<CalendarEvent>(DXN.make('com.example.type.calendarEvent', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    startTime: Schema.String,
    endTime: Schema.String,
    description: Schema.String,
  }),
) {}

const TestToolkit = Toolkit.make(
  Tool.make('Calculator', {
    description: 'Basic calculator tool',
    parameters: {
      input: Schema.String.annotations({
        description: 'The calculation to perform.',
      }),
    },
    success: Schema.Struct({
      result: Schema.Number,
    }),
    failure: Schema.Never,
  }),
);

// Tool handlers.
const toolkitLayer = TestToolkit.toLayer({
  Calculator: ({ input }) =>
    Effect.gen(function* () {
      const result = (() => {
        // Restrict to basic arithmetic operations for safety.
        const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
        log.info('calculate', { sanitizedInput });

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        return Function(`"use strict"; return (${sanitizedInput})`)();
      })();

      return { result };
    }),
});

// The model's turn-by-turn behaviour is scripted inline per test (no recorded conversation to
// regenerate). Real tools still execute; assertions stay on the response/side-effects.
const testLayer = (script: ScriptedAiService.Script) =>
  Layer.empty.pipe(
    Layer.provideMerge(ToolExecutionServices),
    Layer.provideMerge(
      AssistantTestLayer({
        types: [CalendarEvent],
        tracing: 'pretty',
        aiService: ScriptedAiService.layer(script),
      }),
    ),
    Layer.provideMerge(toolkitLayer),
  );

describe('AiRequest.Request', () => {
  it.effect(
    'no tools',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const response = yield* request.run({
          prompt: 'Hello world!',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(testLayer([ScriptedAiService.text('Hello! How can I help you today?')])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'calculator',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const response = yield* request.run({
          toolkit,
          prompt: 'What is 10 + 30?',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(
        testLayer([
          ScriptedAiService.toolCall('Calculator', { input: '10 + 30' }),
          ScriptedAiService.text('10 + 30 = **40**'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tool schema error',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const response = yield* request.run({
          toolkit,
          prompt:
            'I am testing error handling in tool paramter parsing. I want you to call the calculator tool but omit the input parameter to intentionally differ from the tool schema.',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(
        testLayer([
          // The model omits the required `input` parameter, intentionally diverging from the tool
          // schema so the resulting decode failure is fed back as a tool error.
          ScriptedAiService.turn({
            text: "Sure! I'll call the Calculator tool while intentionally omitting the required `input` parameter.",
            tools: [{ name: 'Calculator', input: {} }],
          }),
          ScriptedAiService.text('The Calculator tool call failed because the required `input` parameter was missing.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'summarization',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest.Request({ summarizationThreshold: 0 }); // Force summarization.
        const response = yield* request.run({
          prompt: 'What did we talk about?',
          history: [
            Obj.make(Message.Message, {
              created: '2024-01-01T10:00:00Z',
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'How many apples are in the basket?' }],
            }),
            Obj.make(Message.Message, {
              created: '2024-01-01T11:00:00Z',
              sender: { role: 'assistant' },
              blocks: [{ _tag: 'text', text: 'There are 10 apples in the basket.' }],
            }),
          ],
        });
        expect(response).toBeDefined();
      },
      Effect.provide(
        testLayer({
          // The forced summarization runs as a non-streaming side-call on the same model before the
          // streaming main-loop turn replies, so both buckets are scripted under `models`.
          models: {
            opus: {
              generate: [
                ScriptedAiService.text(
                  'The user asked how many apples are in the basket. I answered that there are 10 apples in the basket.',
                ),
              ],
              stream: [
                ScriptedAiService.text(
                  'We were talking about how many apples are in the basket — I mentioned there are 10.',
                ),
              ],
            },
          },
        }),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});

// Travel to rome, florence, livorno, siena, madrid for conferences

const _CALENDAR_EVENTS: CalendarEvent[] = [
  Obj.make(CalendarEvent, {
    title: 'Exploring Ancient Ruins in Rome',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
    description: 'Tech conference at the historic Colosseum with networking opportunities',
  }),
  Obj.make(CalendarEvent, {
    title: 'Renaissance Tech Summit in Florence',
    startTime: '2024-01-01T11:00:00Z',
    endTime: '2024-01-01T12:00:00Z',
    description: 'Discussing AI innovations surrounded by Renaissance art',
  }),
  Obj.make(CalendarEvent, {
    title: 'Travel to Livorno',
    startTime: '2024-01-01T12:00:00Z',
    endTime: '2024-01-01T13:00:00Z',
    description: 'Travel to Livorno',
  }),
  Obj.make(CalendarEvent, {
    title: 'Travel to Siena',
    startTime: '2024-01-01T13:00:00Z',
    endTime: '2024-01-01T14:00:00Z',
    description: 'Travel to Siena',
  }),
  Obj.make(CalendarEvent, {
    title: 'Travel to Madrid',
    startTime: '2024-01-01T14:00:00Z',
    endTime: '2024-01-01T15:00:00Z',
    description: 'Travel to Madrid',
  }),
];
