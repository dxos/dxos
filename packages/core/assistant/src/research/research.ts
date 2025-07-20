//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { AgentStatusReport, ConsolePrinter, ToolRegistry, AiService } from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { CredentialsService, DatabaseService, defineFunction, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataTypes } from '@dxos/schema';

import { LiveExaHandler, MockExaHandler, ExaToolkit } from './exa';
import { createGraphWriterTool } from './graph';
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
  handler: Effect.fnUntraced(function* ({ data: { query, mockSearch } }) {
    const ai = yield* AiService;
    const credentials = yield* CredentialsService;
    const { db } = yield* DatabaseService;
    // const queues = context.getService(QueueService);
    const tracing = yield* TracingService;

    tracing.write(create(AgentStatusReport, { message: 'Researching...' }));

    const toolkit = yield* ExaToolkit.pipe(Effect.provide(mockSearch ? MockExaHandler : LiveExaHandler));

    const printer = new ConsolePrinter();
    const session = new AISession({ operationModel: 'configured' });
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));
    session.statusReport.on((status) => {
      log.info('[agent] status', { status });
      tracing.write(status);
    });
    session.streamEvent.on((event) => log('stream', { event }));

    const graphWriteTool = createGraphWriterTool({ db, schema: DataTypes });
    log.info('graphWriteTool', { schema: graphWriteTool.parameters });

    // TODO(dmaretskyi): Consider adding this pattern as the "Graph" output mode for the session.
    const result = yield* session.run({
      prompt: query,
      history: [],
      systemPrompt: PROMPT,
      toolkit,
      tools: [searchTool.id, graphWriteTool.id],
      toolResolver: new ToolRegistry([searchTool, graphWriteTool]),
    });

    return {
      result: result,
    };

    // queues.contextQueue!.append(data);

    // return {
    //   result: `
    //   The research results are placed in the following objects:
    //     ${data.map((object, id) => `[obj_${id}][dxn:echo:@:${object.id}]`).join('\n')}
    //   `,
    // };
  }),
});
