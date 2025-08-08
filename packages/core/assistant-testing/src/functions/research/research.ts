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
import type { DXN } from '@dxos/keys';
import { Obj } from '@dxos/echo';

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
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { query, mockSearch } }) {
      const researchGraph = (yield* queryResearchGraph()) ?? (yield* createResearchGraph());
      const researchQueue = yield* DatabaseService.load(researchGraph.queue);
      yield* DatabaseService.flush({ indexes: true });

      yield* TracingService.emitStatus({ message: 'Researching...' });

      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });

      const newObjects: DXN[] = [];
      yield* new AiSession()
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
              makeGraphWriterHandler(GraphWriterToolkit, { onAppend: (dxns) => newObjects.push(...dxns) }),
              ContextQueueService.layer(researchQueue),
            ),
          ),
        );

      const newObjectsData = yield* Effect.forEach(newObjects, DatabaseService.resolve);

      return {
        objects: newObjectsData.map((obj, idx) => ({
          // TODO(dmaretskyi): Remove when `Obj.getDXN` returns the absolute DXN.
          '@dxn': newObjects[idx].toString(),
          ...Obj.toJSON(obj),
        })),
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
