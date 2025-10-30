//
// Copyright 2025 DXOS.org
//

import { pipe, flow } from 'effect/Function';
import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as String from 'effect/String';

import { AiService, ConsolePrinter } from '@dxos/ai';
import {
  AiSession,
  GenerationObserver,
  createToolkit,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { type DXN, Obj } from '@dxos/echo';
import { DatabaseService, FunctionInvocationService, TracingService, defineFunction } from '@dxos/functions';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';
import { Template } from '@dxos/blueprints';

import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from '../../crud';
import { exaFunction, exaMockFunction } from '../exa';

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
  description: trim`
    Research the web for information. 
    Inserts structured data into the research graph. 
    Will return research summary and the objects created.
  `,
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: trim`
        The query to search for.
        If doing research on an object, load it first and pass it as a JSON string.
      `,
    }),

    researchInstructions: Schema.optional(Schema.String).annotations({
      description: trim`
        The instructions for the research agent. 
        E.g., preference on fast responses or in-depth analysis, number of web searcher or the objects created.
      `,
    }),

    // TOOD(burdon): Move to context.
    mockSearch: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to use the mock search tool.',
      default: false,
    }),

    entityExtraction: Schema.optional(Schema.Boolean).annotations({
      description:
        'Whether to extract structured entities from the research. Experimental feature only enable if user explicitly requests it.',
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
    function* ({ data: { query, researchInstructions, mockSearch = false, entityExtraction = false } }) {
      if (mockSearch) {
        const mockPerson = yield* DatabaseService.add(
          Obj.make(DataType.Person, {
            preferredName: 'John Doe',
            emails: [{ value: 'john.doe@example.com' }],
            phoneNumbers: [{ value: '123-456-7890' }],
          }),
        );

        return {
          note: trim`
            The research run in test-mode and was mocked. 
            Proceed as usual.
            We reference John Doe to test reference: ${Obj.getDXN(mockPerson)}
          `,
          objects: [Obj.toJSON(mockPerson)],
        };
      }

      yield* DatabaseService.flush({ indexes: true });
      yield* TracingService.emitStatus({ message: 'Researching...' });

      const NativeWebSearch = Toolkit.make(AnthropicTool.WebSearch_20250305({}));
      let toolkit: Toolkit.Any = NativeWebSearch;
      let handlers: Layer.Layer<any, any> = Layer.empty as any;

      const objectDXNs: DXN[] = [];
      if (entityExtraction) {
        const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });
        const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit, {
          onAppend: (dxns) => objectDXNs.push(...dxns),
        });
        toolkit = Toolkit.merge(toolkit, LocalSearchToolkit, GraphWriterToolkit);
        handlers = Layer.mergeAll(handlers, LocalSearchHandler, GraphWriterHandler).pipe(
          Layer.provide(contextQueueLayerFromResearchGraph),
        ) as any;
      }

      const finishedToolkit = yield* createToolkit({
        toolkit: toolkit as any,
      }).pipe(Effect.provide(handlers));

      const session = new AiSession();
      const result = yield* session.run({
        prompt: query,
        system:
          Template.process(PROMPT, { entityExtraction }) +
          (researchInstructions
            ? '\n\n' + `<research_instructions>${researchInstructions}</research_instructions>`
            : ''),
        toolkit: finishedToolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'research' })),
      });

      const objects = yield* Effect.forEach(objectDXNs, (dxn) => DatabaseService.resolve(dxn)).pipe(
        Effect.map(Array.map((obj) => Obj.toJSON(obj))),
      );

      return {
        note: extractLastTextBlock(result),
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

/**
 * Extracts the last text block from the result.
 * Skips citations.
 */
const extractLastTextBlock = (result: DataType.Message[]) => {
  return pipe(
    result,
    Array.last,
    Option.map(
      flow(
        (_) => _.blocks,
        Array.reverse,
        Array.dropWhile((_) => _._tag === 'summary'),
        Array.takeWhile((_) => _._tag === 'text'),
        Array.reverse,
        Array.map((_) => _.text),
        Array.reduce('', String.concat),
      ),
    ),
    Option.getOrElse(() => ''),
  );
};
