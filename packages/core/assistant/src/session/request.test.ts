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
import { Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { ToolExecutionServices } from '../functions';
import { AssistantTestLayer } from '../testing';
import { AiRequest } from './request';

// Define a calendar event artifact schema.
const CalendarEventSchema = Schema.Struct({
  title: Schema.String,
  startTime: Schema.String,
  endTime: Schema.String,
  description: Schema.String,
}).pipe(
  Type.object({
    typename: 'com.example.type.calendar-event',
    version: '0.1.0',
  }),
);

type CalendarEvent = Schema.Schema.Type<typeof CalendarEventSchema>;

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

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ToolExecutionServices),
  Layer.provideMerge(
    AssistantTestLayer({
      types: [CalendarEventSchema],
      tracing: 'pretty',
    }),
  ),
  Layer.provideMerge(toolkitLayer),
);

describe('AiRequest', () => {
  it.effect(
    'no tools',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest();
        const response = yield* request.run({
          prompt: 'Hello world!',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'calculator',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const response = yield* request.run({
          toolkit,
          prompt: 'What is 10 + 30?',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tool schema error',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest();
        const toolkit = yield* OpaqueToolkit.fromContext(TestToolkit);
        const response = yield* request.run({
          toolkit,
          prompt:
            'I am testing error handling in tool paramter parsing. I want you to call the calculator tool but omit the input parameter to intentionally differ from the tool schema.',
          history: [],
        });
        log.info('response', { response });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'summarization',
    Effect.fnUntraced(
      function* (_) {
        const request = new AiRequest({ summarizationThreshold: 0 }); // Force summarization.
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
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Travel to rome, florence, livorno, siena, madrid for conferences

const _CALENDAR_EVENTS: CalendarEvent[] = [
  Obj.make(CalendarEventSchema, {
    title: 'Exploring Ancient Ruins in Rome',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
    description: 'Tech conference at the historic Colosseum with networking opportunities',
  }),
  Obj.make(CalendarEventSchema, {
    title: 'Renaissance Tech Summit in Florence',
    startTime: '2024-01-01T11:00:00Z',
    endTime: '2024-01-01T12:00:00Z',
    description: 'Discussing AI innovations surrounded by Renaissance art',
  }),
  Obj.make(CalendarEventSchema, {
    title: 'Travel to Livorno',
    startTime: '2024-01-01T12:00:00Z',
    endTime: '2024-01-01T13:00:00Z',
    description: 'Travel to Livorno',
  }),
  Obj.make(CalendarEventSchema, {
    title: 'Travel to Siena',
    startTime: '2024-01-01T13:00:00Z',
    endTime: '2024-01-01T14:00:00Z',
    description: 'Travel to Siena',
  }),
  Obj.make(CalendarEventSchema, {
    title: 'Travel to Madrid',
    startTime: '2024-01-01T14:00:00Z',
    endTime: '2024-01-01T15:00:00Z',
    description: 'Travel to Madrid',
  }),
];
