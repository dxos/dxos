//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { Array, Effect, Layer, Schema } from 'effect';

import { AiService, ConsolePrinter, ToolId } from '@dxos/ai';
import {
  AiSession,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { createToolkit } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import {
  ContextQueueService,
  DatabaseService,
  LocalFunctionExecutionService,
  TracingService,
  defineFunction,
} from '@dxos/functions';
import { type DXN } from '@dxos/keys';

import { exaFunction, exaMockFunction } from '../exa';

import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up.
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
    note: Schema.optional(Schema.String).annotations({
      description: 'A note from the research agent.',
    }),
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

      const objectDXNs: DXN[] = [];
      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });
      const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit, {
        onAppend: (dxns) => objectDXNs.push(...dxns),
      });

      const toolkit = yield* createToolkit({
        toolkit: AiToolkit.merge(LocalSearchToolkit, GraphWriterToolkit),
        toolIds: [mockSearch ? ToolId.make(exaMockFunction.name) : ToolId.make(exaFunction.name)],
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            //
            GraphWriterHandler,
            LocalSearchHandler,
            ContextQueueService.layer(researchQueue),
          ),
        ),
      );

      const session = new AiSession();
      const result = yield* session.run({
        prompt: query,
        system: PROMPT,
        toolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'research' })),
      });

      const lastBlock = result.at(-1)?.blocks.at(-1);
      const note = lastBlock?._tag === 'text' ? lastBlock.text : undefined;
      const objects = yield* Effect.forEach(objectDXNs, (dxn) => DatabaseService.resolve(dxn)).pipe(
        Effect.map(Array.map((obj) => Obj.toJSON(obj))),
      );

      return {
        note,
        objects,
      };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-sonnet-4-0'),
        // TODO(dmaretskyi): Extract.
        makeToolResolverFromFunctions([exaFunction, exaMockFunction], AiToolkit.make()),
        makeToolExecutionServiceFromFunctions(
          [exaFunction, exaMockFunction],
          AiToolkit.make() as any,
          Layer.empty as any,
        ),
        TracingService.layerNoop,
      ).pipe(Layer.provide(LocalFunctionExecutionService.layer)),
    ),
  ),
});
