import { describe, test } from 'vitest';
import { AISession } from './session';
import { createEdgeServices, remoteServiceEndpoints } from '../services';
import { defineArtifact, defineTool, ToolResult, type MessageContentBlock } from '@dxos/artifact';
import { Schema as S } from 'effect';
import { createStatic, EchoObject, ObjectId } from '@dxos/echo-schema';
import { AIServiceEdgeClient, OllamaClient, type GenerationStreamEvent } from '@dxos/assistant';
import { log } from '@dxos/log';

// Define a calendar event artifact schema
const CalendarEventSchema = S.Struct({
  title: S.String,
  startTime: S.String,
  endTime: S.String,
  description: S.String,
}).pipe(EchoObject('example.com/type/CalendarEvent', '0.1.0'));

type CalendarEvent = S.Schema.Type<typeof CalendarEventSchema>;

describe('AISession with Ollama', () => {
  test('create calendar itinerary', { timeout: 10000 }, async ({ expect }) => {
    // const aiClient = new AIServiceEdgeClient({ endpoint: remoteServiceEndpoints.ai });
    const aiClient = new OllamaClient({
      overrides: { model: 'llama3.1:8b' },
    });
    const session = new AISession();

    // Define calendar artifact
    const calendarArtifact = defineArtifact({
      id: 'dxos.org/plugin/calendar',
      name: 'Calendar',
      instructions: 'Use this to create and manage calendar events',
      schema: CalendarEventSchema,
      tools: [
        defineTool('calendar', {
          name: 'query',
          description: 'Query the calendar for events',
          schema: S.Struct({}),
          execute: async () => {
            return ToolResult.Success(CALENDAR_EVENTS);
          },
        }),
      ],
    });

    session.streamEvent.on((event) => {
      printStreamEvent(event);
    });

    session.message.on((message) => {
      log.info('message', { message });
    });

    session.block.on((block) => {
      log.info('block', { block });
    });

    // session.update.on((update) => {
    //   log.info('update', { update });
    // });

    // Test creating an itinerary
    const response = await session.run({
      client: aiClient,
      tools: [],
      artifacts: [calendarArtifact],
      history: [],
      prompt: 'create a travel itinerary for my calendar',
    });

    log.info('response', { response });

    expect(response).toBeDefined();

    // Verify the created events have required fields
    for (const event of response) {
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('startTime');
      expect(event).toHaveProperty('endTime');
      expect(event).toHaveProperty('description');
    }
  });
});

// Travel to rome, florence, livorno, siena, madrid for conferences
const CALENDAR_EVENTS: CalendarEvent[] = [
  createStatic(CalendarEventSchema, {
    title: 'Exploring Ancient Ruins in Rome',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
    description: 'Tech conference at the historic Colosseum with networking opportunities',
  }),
  createStatic(CalendarEventSchema, {
    title: 'Renaissance Tech Summit in Florence',
    startTime: '2024-01-01T11:00:00Z',
    endTime: '2024-01-01T12:00:00Z',
    description: 'Discussing AI innovations surrounded by Renaissance art',
  }),
  createStatic(CalendarEventSchema, {
    title: 'Travel to Livorno',
    startTime: '2024-01-01T12:00:00Z',
    endTime: '2024-01-01T13:00:00Z',
    description: 'Travel to Livorno',
  }),
  createStatic(CalendarEventSchema, {
    title: 'Travel to Siena',
    startTime: '2024-01-01T13:00:00Z',
    endTime: '2024-01-01T14:00:00Z',
    description: 'Travel to Siena',
  }),
  createStatic(CalendarEventSchema, {
    title: 'Travel to Madrid',
    startTime: '2024-01-01T14:00:00Z',
    endTime: '2024-01-01T15:00:00Z',
    description: 'Travel to Madrid',
  }),
];

const printContentBlock = (content: MessageContentBlock) => {
  switch (content.type) {
    case 'text':
      process.stdout.write(content.text);
      break;
    case 'tool_use':
      process.stdout.write(`⚙️ [Tool Use] ${content.name}\n`);
      break;
  }
};

const printStreamEvent = (event: GenerationStreamEvent) => {
  switch (event.type) {
    case 'message_start': {
      process.stdout.write(`${event.message.role.toUpperCase()}\n\n`);
      for (const content of event.message.content) {
        printContentBlock(content);
      }
      break;
    }
    case 'content_block_start': {
      printContentBlock(event.content);
      break;
    }
    case 'content_block_delta': {
      switch (event.delta.type) {
        case 'text_delta': {
          process.stdout.write(event.delta.text);
          break;
        }
        case 'input_json_delta': {
          process.stdout.write(event.delta.partial_json);
          break;
        }
      }
      break;
    }
    case 'content_block_stop': {
      process.stdout.write('\n');
      break;
    }
    case 'message_delta': {
      break;
    }
    case 'message_stop': {
      process.stdout.write('\n\n');
      break;
    }
  }
};
