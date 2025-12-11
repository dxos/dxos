//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as String from 'effect/String';

import { AiService, ConsolePrinter } from '@dxos/ai';
import {
  AiSession,
  GenerationObserver,
  createToolkit,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { type DXN, Obj } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TracingService, defineFunction } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked } from '@dxos/functions-runtime/testing';
import { type Message, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from '../../crud';
import { exaFunction, exaMockFunction } from '../exa';

import { contextQueueLayerFromResearchGraph } from './research-graph';
import PROMPT from './research-instructions.tpl?raw';
import { ResearchDataTypes } from './types';

/**
 * Exec external service and return the results as a Subgraph.
 */
export default defineFunction({
  key: 'dxos.org/function/research',
  name: 'Research',
  description: trim`
    Search the web to research information about the given subject.
    Inserts structured data into the research graph. 
    Creates a research summary and returns the objects created.
  `,
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: trim`
        The search query.
        If doing research on an object then load it first and pass it as JSON.
      `,
    }),

    instructions: Schema.optional(Schema.String).annotations({
      description: trim`
        The instructions for the research agent. 
      `,
    }),

    // TOOD(burdon): Move to context.
    mockSearch: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to use the mock search tool.',
      default: false,
    }),

    entityExtraction: Schema.optional(Schema.Boolean).annotations({
      description: trim`
        Whether to extract structured entities from the research. 
        Experimental feature only enable if user explicitly requests it.
      `,
      default: false,
    }),
  }),
  outputSchema: Schema.Struct({
    document: Schema.optional(Schema.String).annotations({
      description: 'The generated research document.',
    }),
    objects: Schema.Array(Schema.Unknown).annotations({
      description: 'Structured objects created during the research process.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { query, instructions, mockSearch = false, entityExtraction = false } }) {
      if (mockSearch) {
        const mockPerson = yield* Database.Service.add(
          Obj.make(Person.Person, {
            preferredName: 'John Doe',
            emails: [{ value: 'john.doe@example.com' }],
            phoneNumbers: [{ value: '123-456-7890' }],
          }),
        );

        return {
          document: trim`
            The research ran in test-mode and was mocked. Proceed as usual.
            We reference John Doe to test reference: ${Obj.getDXN(mockPerson)}
          `,
          objects: [Obj.toJSON(mockPerson)],
        };
      }

      yield* Database.Service.flush({ indexes: true });
      yield* TracingService.emitStatus({ message: 'Starting research...' });

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

      const finishedToolkit = yield* createToolkit({ toolkit }).pipe(Effect.provide(handlers));

      const session = new AiSession();
      const result = yield* session.run({
        prompt: query,
        system: join(
          Template.process(PROMPT, { entityExtraction }),
          instructions && `<instructions>${instructions}</instructions>`,
        ),
        toolkit: finishedToolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'research' })),
      });

      const objects = yield* Effect.forEach(objectDXNs, (dxn) => Database.Service.resolve(dxn)).pipe(
        Effect.map(Array.map((obj) => Obj.toJSON(obj))),
      );

      return {
        document: extractLastTextBlock(result),
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
          Layer.mergeAll(FunctionInvocationServiceLayerTestMocked({ functions: [exaFunction, exaMockFunction] })),
        ),
      ),
    ),
  ),
});

// TODO(burdon): Factor out.
const join = (...strings: (string | undefined)[]) => strings.filter(Boolean).join('\n\n');

/**
 * Extracts the last text block from the result.
 * Skips citations.
 */
// TODO(burdon): Factor out.
const extractLastTextBlock = (result: Message.Message[]) => {
  return Function.pipe(
    result,
    Array.last,
    Option.map(
      Function.flow(
        (_: Message.Message) => _.blocks,
        Array.reverse,
        Array.dropWhile((_: any) => _._tag === 'summary'),
        Array.takeWhile((_: any) => _._tag === 'text'),
        Array.reverse,
        Array.map((_: any) => _.text),
        Array.reduce('', String.concat),
      ),
    ),
    Option.getOrElse(() => ''),
  );
};
