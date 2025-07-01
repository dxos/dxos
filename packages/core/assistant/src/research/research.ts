//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { AgentStatusReport, ConsolePrinter } from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { AiService, CredentialsService, DatabaseService, defineFunction, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataTypes } from '@dxos/schema';

import { createExaTool, createMockExaTool } from './exa';
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
    // result: Schema.String,
    result: Schema.Any,
  }),
  handler: async ({ data: { query, mockSearch }, context }) => {
    const ai = context.getService(AiService);
    const credentials = context.getService(CredentialsService);
    const { db } = context.getService(DatabaseService);
    // const queues = context.getService(QueueService);
    const tracing = context.getService(TracingService);

    tracing.write(create(AgentStatusReport, { message: 'Researching...' }));

    const exaCredential = await credentials.getCredential({ service: 'exa.ai' });
    const searchTool = mockSearch ? createMockExaTool() : createExaTool({ apiKey: exaCredential.apiKey! });

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
    const result = await session.run({
      client: ai.client,
      systemPrompt: PROMPT,
      artifacts: [],
      tools: [searchTool, graphWriteTool],
      history: [],
      prompt: query,
    });

    return {
      result: result as any,
    };

    // queues.contextQueue!.append(data);

    // return {
    //   result: `
    //   The research results are placed in the following objects:
    //     ${data.map((object, id) => `[obj_${id}][dxn:echo:@:${object.id}]`).join('\n')}
    //   `,
    // };
  },
});
