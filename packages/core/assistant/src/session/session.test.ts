//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, MemoizedAiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { TracingService } from '@dxos/functions';
import { log } from '@dxos/log';

import { AiSession } from './session';

// Define a calendar event artifact schema.
const CalendarEventSchema = Schema.Struct({
  title: Schema.String,
  startTime: Schema.String,
  endTime: Schema.String,
  description: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/CalendarEvent',
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

const TestLayer = Layer.mergeAll(
  toolkitLayer,
  AiService.model('@anthropic/@anthropic/claude-sonnet-4-5'),
  TracingService.layerNoop,
  ToolResolverService.layerEmpty,
  ToolExecutionService.layerEmpty,
).pipe(
  //
  Layer.provideMerge(MemoizedAiService.layerTest()),
  Layer.provide(AiServiceTestingPreset('direct')),
);

describe('AiSession', () => {
  it.effect(
    'no tools',
    Effect.fnUntraced(
      function* (_) {
        const session = new AiSession({ operationModel: 'configured' });
        const response = yield* session.run({
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
        const session = new AiSession({ operationModel: 'configured' });
        const toolkit = yield* TestToolkit;
        const response = yield* session.run({
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
