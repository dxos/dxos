//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { Array, Effect, Layer, Schema } from 'effect';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { ContextQueueService, DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import type { DXN } from '@dxos/keys';

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
    objects: Schema.Array(Schema.Unknown).annotations({
      description: 'The structured objects created as a result of the research.',
    }),
    note: Schema.optional(Schema.String).annotations({
      description: 'A note from the research agent.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { query, mockSearch } }) {
      const researchGraph = (yield* queryResearchGraph()) ?? (yield* createResearchGraph());
      const researchQueue = yield* DatabaseService.load(researchGraph.queue);
      yield* DatabaseService.flush({ indexes: true });

      yield* TracingService.emitStatus({ message: 'Researching...' });

      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });

      const newObjectDXNs: DXN[] = [];
      const result = yield* new AiSession()
        .run({
          prompt: query,
          history: [],
          system: PROMPT,
          toolkit: AiToolkit.merge(ExaToolkit, LocalSearchToolkit, GraphWriterToolkit),
          observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'research' })),
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(
              mockSearch ? ExaToolkit.layerMock : ExaToolkit.layerLive,
              LocalSearchHandler,
              makeGraphWriterHandler(GraphWriterToolkit, { onAppend: (dxns) => newObjectDXNs.push(...dxns) }),
              ContextQueueService.layer(researchQueue),
            ),
          ),
        );

      const lastBlock = result.at(-1)?.blocks.at(-1);
      const note = lastBlock?._tag === 'text' ? lastBlock.text : undefined;

      const objects = yield* Effect.forEach(newObjectDXNs, (dxn) => DatabaseService.resolve(dxn)).pipe(
        Effect.map(Array.map((obj) => Obj.toJSON(obj))),
      );

      return {
        objects,
        note,
      };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-sonnet-4-0'),
        ToolResolverService.layerEmpty,
        ToolExecutionService.layerEmpty,
      ),
    ),
  ),
});
