//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { AIServiceEdgeClient, ConsolePrinter, createTool, ToolResult } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { ArtifactId, defineArtifact } from '@dxos/artifact';
import { Type } from '@dxos/echo';
import { create, ObjectId } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { AISession } from './session';

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

// TODO(burdon): Flaky.
describe.skip('AISession with Ollama', () => {
  test('create calendar itinerary', { timeout: 60_000 }, async () => {
    const aiClient = new AIServiceEdgeClient({ endpoint: AI_SERVICE_ENDPOINT.REMOTE });
    // const aiClient = new OllamaClient({
    //   overrides: { model: 'llama3.1:8b' },
    // });
    const session = new AISession({ operationModel: 'configured' });

    const objects = new Set<string>();

    // Define calendar artifact.
    const calendarArtifact = defineArtifact({
      id: 'artifact:dxos.org/plugin/calendar',
      name: 'Calendar',
      instructions: 'Use this to create and query calendar events.',
      schema: CalendarEventSchema,
      tools: [
        createTool('calendar', {
          name: 'query',
          description: 'Query the calendar for events',
          schema: Schema.Struct({}),
          execute: async () => {
            return ToolResult.Success(CALENDAR_EVENTS);
          },
        }),
      ],
    });

    const tableArtifact = defineArtifact({
      id: 'artifact:dxos.org/plugin/table',
      name: 'Table',
      instructions: 'Use this to create and manage tables. Each table has a unique id.',
      schema: Schema.Struct({}),
      tools: [
        createTool('table', {
          name: 'create',
          description: 'Create a table',
          schema: Schema.Struct({
            data: Schema.Array(Schema.Any).annotations({ description: 'Array of data payloads to add as rows' }),
          }),
          execute: async ({ data }) => {
            log('create table', { data });
            const id = DXN.fromLocalObjectId(ObjectId.random()).toString();
            objects.add(id);
            // TODO(dmaretskyi): consider xml for refs instead of @dxn:echo:@:XXXXX
            return ToolResult.Success(`table @${id}`);
          },
        }),
      ],
    });

    const mapArtifact = defineArtifact({
      id: 'artifact:dxos.org/plugin/map',
      name: 'Map',
      instructions:
        'Use this to create and manage maps. Maps source data from tables. Table id is required to create a map.',
      schema: Schema.Struct({}),
      tools: [
        createTool('map', {
          name: 'create',
          description: 'Create a map',
          schema: Schema.Struct({
            source: ArtifactId.annotations({
              description: 'The table that will be used as the source of the map',
            }),
          }),
          execute: async ({ source }) => {
            // TODO(dmaretskyi): Use effect-schema decode instead of manual parsing.
            const sourceId = ArtifactId.toDXN(source);
            if (!objects.has(sourceId.toString())) {
              return ToolResult.Error(`table id=${source} not found`);
            }
            log('create map', { sourceId });
            const id = DXN.fromLocalObjectId(ObjectId.random()).toString();
            objects.add(id);
            // TODO(dmaretskyi): consider xml for refs instead of @dxn:echo:@:XXXXX
            return ToolResult.Success(`map @${id}`);
          },
        }),
      ],
    });

    const scriptArtifact = defineArtifact({
      id: 'artifact:dxos.org/plugin/script',
      name: 'Script',
      instructions: 'Use this to create and manage scripts',
      schema: Schema.Struct({}),
      tools: [],
    });

    // session.streamEvent.on((event) => {
    //   printStreamEvent(event);
    // });

    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    // session.update.on((update) => {
    //   log('update', { update });
    // });

    // Test creating an itinerary
    const response = await session.run({
      client: aiClient,
      tools: [],
      artifacts: [calendarArtifact, tableArtifact, mapArtifact, scriptArtifact],
      requiredArtifactIds: [calendarArtifact.id, tableArtifact.id, mapArtifact.id, scriptArtifact.id],
      history: [],
      generationOptions: {
        model: '@anthropic/claude-3-5-haiku-20241022',
      },
      prompt: 'create a table and map for a travel itinerary based on events in my calendar',
    });

    log('result', {
      objects,
      finalMessage: response.at(-1),
    });
  });
});

// Travel to rome, florence, livorno, siena, madrid for conferences
const CALENDAR_EVENTS: CalendarEvent[] = [
  create(CalendarEventSchema, {
    title: 'Exploring Ancient Ruins in Rome',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
    description: 'Tech conference at the historic Colosseum with networking opportunities',
  }),
  create(CalendarEventSchema, {
    title: 'Renaissance Tech Summit in Florence',
    startTime: '2024-01-01T11:00:00Z',
    endTime: '2024-01-01T12:00:00Z',
    description: 'Discussing AI innovations surrounded by Renaissance art',
  }),
  create(CalendarEventSchema, {
    title: 'Travel to Livorno',
    startTime: '2024-01-01T12:00:00Z',
    endTime: '2024-01-01T13:00:00Z',
    description: 'Travel to Livorno',
  }),
  create(CalendarEventSchema, {
    title: 'Travel to Siena',
    startTime: '2024-01-01T13:00:00Z',
    endTime: '2024-01-01T14:00:00Z',
    description: 'Travel to Siena',
  }),
  create(CalendarEventSchema, {
    title: 'Travel to Madrid',
    startTime: '2024-01-01T14:00:00Z',
    endTime: '2024-01-01T15:00:00Z',
    description: 'Travel to Madrid',
  }),
];

// const printStreamEvent = (event: GenerationStreamEvent) => {
//   switch (event.type) {
//     case 'message_start': {
//       process.stdout.write(`${event.message.role.toUpperCase()}\n\n`);
//       for (const content of event.message.content) {
//         printContentBlock(content);
//       }
//       break;
//     }
//     case 'content_block_start': {
//       printContentBlock(event.content);
//       break;
//     }
//     case 'content_block_delta': {
//       switch (event.delta.type) {
//         case 'text_delta': {
//           process.stdout.write(event.delta.text);
//           break;
//         }
//         case 'input_json_delta': {
//           process.stdout.write(event.delta.partial_json);
//           break;
//         }
//       }
//       break;
//     }
//     case 'content_block_stop': {
//       process.stdout.write('\n');
//       break;
//     }
//     case 'message_delta': {
//       break;
//     }
//     case 'message_stop': {
//       process.stdout.write('\n\n');
//       break;
//     }
//   }
// };
