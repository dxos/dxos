//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { Effect, Layer, Schema } from 'effect';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { ContextQueueService, DatabaseService, TracingService, defineFunction } from '@dxos/functions';

import { ExaToolkit } from './exa';
import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up
import PROMPT from './instructions-research.tpl?raw';
import { createResearchGraph, queryResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

/**
 * Exec external service and return the results as a Subgraph.
 */
export default defineFunction({
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
      const researchGraph = (yield* queryResearchGraph()) ?? (yield* createResearchGraph());
      const researchQueue = yield* DatabaseService.load(researchGraph.queue);
      yield* DatabaseService.flush({ indexes: true });

      yield* TracingService.emitStatus({ message: 'Researching...' });

      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });

      const result = yield* new AiSession()
        .run({
          prompt: query,
          history: [],
          system: PROMPT,
          toolkit: AiToolkit.merge(ExaToolkit, LocalSearchToolkit, GraphWriterToolkit),
          observer: GenerationObserver.fromPrinter(new ConsolePrinter()),
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(
              mockSearch ? ExaToolkit.layerMock : ExaToolkit.layerLive,
              LocalSearchHandler,
              makeGraphWriterHandler(GraphWriterToolkit),
              ContextQueueService.layer(researchQueue),
            ),
          ),
        );

      return {
        result,
      };
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
