//
// Copyright 2025 DXOS.org
//

import { Toolkit } from '@effect/ai';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import { Array, Effect, Layer, Schema } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import {
  AiSession,
  GenerationObserver,
  createToolkit,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, FunctionInvocationService, TracingService, defineFunction } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { exaFunction, exaMockFunction } from '../exa';

import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up.
import PROMPT from './instructions-research.tpl?raw';
import { contextQueueLayerFromResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

/**
 * Exec external service and return the results as a Subgraph.
 */
export default defineFunction({
  key: 'dxos.org/function/research',
  name: 'Research',
  description:
    'Research the web for information. Inserts structured data into the research graph. Will return research summary and the objects created.',
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),

    researchInstructions: Schema.optional(Schema.String).annotations({
      description:
        'The instructions for the research agent. E.g. preference on fast responses or in-depth analysis, number of web searcher or the objects created.',
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
    function* ({ data: { query, mockSearch, researchInstructions } }) {
      if (mockSearch) {
        const mockPerson = yield* DatabaseService.add(
          Obj.make(DataType.Person, {
            preferredName: 'John Doe',
            emails: [{ value: 'john.doe@example.com' }],
            phoneNumbers: [{ value: '123-456-7890' }],
          }),
        );
        return {
          note: `The research run in test-mode and was mocked. Proceed as usual. We reference John Doe to test reference: ${Obj.getDXN(mockPerson)}`,
          objects: [Obj.toJSON(mockPerson)],
        };
      }

      yield* DatabaseService.flush({ indexes: true });
      yield* TracingService.emitStatus({ message: 'Researching...' });

      const objectDXNs: DXN[] = [];
      const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });
      const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit, {
        onAppend: (dxns) => objectDXNs.push(...dxns),
      });
      const NativeWebSearch = Toolkit.make(AnthropicTool.WebSearch_20250305({}));

      const toolkit = yield* createToolkit({
        toolkit: Toolkit.merge(LocalSearchToolkit, GraphWriterToolkit, NativeWebSearch),
        // toolIds: [mockSearch ? ToolId.make(exaMockFunction.key) : ToolId.make(exaFunction.key)],
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            //
            GraphWriterHandler,
            LocalSearchHandler,
          ).pipe(Layer.provide(contextQueueLayerFromResearchGraph)),
        ),
      );

      const session = new AiSession();
      const result = yield* session.run({
        prompt: query,
        system:
          PROMPT +
          (researchInstructions
            ? '\n\n' + `<research_instructions>${researchInstructions}</research_instructions>`
            : ''),
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
        makeToolResolverFromFunctions([exaFunction, exaMockFunction], Toolkit.make()),
        makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
      ).pipe(
        Layer.provide(
          // TODO(dmaretskyi): This should be provided by environment.
          Layer.mergeAll(FunctionInvocationService.layerTestMocked({ functions: [exaFunction, exaMockFunction] })),
        ),
      ),
    ),
  ),
});
