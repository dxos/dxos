//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { Effect, Layer, Schema } from 'effect';

import { AgentStatus, AiService, ConsolePrinter } from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { defineFunction, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataTypes } from '@dxos/schema';

import { ExaToolkit, LiveExaHandler, MockExaHandler } from './exa';
import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up
import PROMPT from './instructions-research.tpl?raw';
import { AISession } from '../session';

/**
 * Exec external service and return the results as a Subgraph.
 */
// TODO(burdon): Rename.
export const researchFn = defineFunction({
  description: 'Research the web for information',
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),

    // TOOD(burdon): Move to context.
    mockSearch: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to use the mock search tool.',
      default: false,
    }),
  }),
  outputSchema: Schema.Struct({
    result: Schema.Unknown,
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { query, mockSearch } }) {
      // const queues = context.getService(QueueService);

      // TODO(dmaretskyi): Extract to a function.
      const tracing = yield* TracingService;
      tracing.write(create(AgentStatus, { message: 'Researching...' }));

      const graphWriteToolkit = makeGraphWriterToolkit({ schema: DataTypes });
      const toolkit = yield* AiToolkit.merge(ExaToolkit, LocalSearchToolkit, graphWriteToolkit).pipe(
        Effect.provide(
          Layer.mergeAll(
            mockSearch ? MockExaHandler : LiveExaHandler,
            LocalSearchHandler,
            makeGraphWriterHandler(graphWriteToolkit),
          ),
        ),
      );

      const printer = new ConsolePrinter();
      const session = new AISession();
      session.message.on((message) => printer.printMessage(message));
      session.userMessage.on((message) => printer.printMessage(message));
      session.block.on((block) => printer.printContentBlock(block));
      session.streamEvent.on((event) => log('stream', { event }));

      // TODO(dmaretskyi): Consider adding this pattern as the "Graph" output mode for the session.
      const result = yield* session.run({
        prompt: query,
        history: [],
        systemPrompt: PROMPT,
        toolkit,
      });

      return {
        result,
      };

      // queues.contextQueue!.append(data);

      // return {
      //   result: `
      //   The research results are placed in the following objects:
      //     ${data.map((object, id) => `[obj_${id}][dxn:echo:@:${object.id}]`).join('\n')}
      //   `,
      // };
    },
    Effect.provide(AiService.model('@anthropic/claude-3-5-sonnet-20241022')),
  ),
});
