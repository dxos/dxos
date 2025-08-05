//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { Effect, Layer, Schema } from 'effect';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataTypes } from '@dxos/schema';

import { AiSession, GenerationObserver } from '../session';

import { ExaToolkit } from './exa';
import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up
import PROMPT from './instructions-research.tpl?raw';

/**
 * Exec external service and return the results as a Subgraph.
 */
// TODO(burdon): Rename.
export const researchFn = defineFunction({
  name: 'dxos.org/function/research',
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
      yield* TracingService.emitStatus({ message: 'Researching...' });

      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: DataTypes });

      // TODO(dmaretskyi): Consider adding this pattern as the "Graph" output mode for the session.
      const result = yield* new AiSession()
        .run({
          prompt: query,
          history: [],
          systemPrompt: PROMPT,
          toolkit: AiToolkit.merge(ExaToolkit, LocalSearchToolkit, GraphWriterToolkit),
          observer: GenerationObserver.fromPrinter(new ConsolePrinter()),
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(
              mockSearch ? ExaToolkit.layerMock : ExaToolkit.layerLive,
              LocalSearchHandler,
              makeGraphWriterHandler(GraphWriterToolkit),
            ),
          ),
        );

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
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ToolResolverService.layerEmpty,
        ToolExecutionService.layerEmpty,
      ),
    ),
  ),
});
