//
// Copyright 2025 DXOS.org
//

import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as String from 'effect/String';

import { AiService, ConsolePrinter, OpaqueToolkit } from '@dxos/ai';
import { AiRequest, GenerationObserver, ToolExecutionServices, createToolkit } from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { type DXN, Entity, Obj } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Trace, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { type Message, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { LocalSearchHandler, LocalSearchToolkit, makeGraphWriterHandler, makeGraphWriterToolkit } from '../../../crud';
import { ResearchGraph } from '../types';
import { ResearchDataTypes } from '../types';
import { Research } from './definitions';
import PROMPT from './research-instructions.tpl?raw';

/**
 * Exec external service and return the results as a Subgraph.
 */
export default Research.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ query, instructions, mockSearch = false, entityExtraction = false }) {
        if (mockSearch) {
          const mockPerson = yield* Database.add(
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

        yield* Database.flush();
        yield* TracingService.emitStatus({ message: 'Starting research...' });

        const NativeWebSearch = Toolkit.make(AnthropicTool.WebSearch_20250305({}));

        let toolkitDef: Toolkit.Any = NativeWebSearch;
        let handlers: Layer.Layer<any, any> = Layer.empty as any;

        const objectDXNs: DXN[] = [];
        if (entityExtraction) {
          const GraphWriterToolkit = makeGraphWriterToolkit({ schema: ResearchDataTypes });
          const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit, {
            onAppend: (dxns) => objectDXNs.push(...dxns),
          });

          toolkitDef = Toolkit.merge(toolkitDef, LocalSearchToolkit, GraphWriterToolkit);
          handlers = Layer.mergeAll(handlers, LocalSearchHandler, GraphWriterHandler).pipe(
            Layer.provide(ResearchGraph.contextQueueLayer),
          ) as any;
        }

        const toolkit = yield* createToolkit({
          toolkit: OpaqueToolkit.make(toolkitDef as Toolkit.Toolkit<any>, handlers),
        });

        const request = new AiRequest({
          observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'research' })),
        });
        const result = yield* request.run({
          prompt: query,
          system: join(
            Template.process(PROMPT, { entityExtraction }),
            instructions && `<instructions>${instructions}</instructions>`,
          ),
          toolkit,
        });

        const objects = yield* Effect.forEach(objectDXNs, (dxn) => Database.resolve(dxn)).pipe(
          Effect.map(Array.map((obj) => Entity.toJSON(obj))),
        );

        return {
          document: extractLastTextBlock(result),
          objects,
        };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-sonnet-4-0'),
          ToolExecutionServices,
          Trace.writerLayerNoop,
        ).pipe(Layer.provide(OpaqueToolkit.providerEmpty)),
      ),
    ),
  ),
  Operation.opaqueHandler,
);

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
        Array.dropWhile((_: any) => _._tag === 'stats'),
        Array.takeWhile((_: any) => _._tag === 'text'),
        Array.reverse,
        Array.map((_: any) => _.text),
        Array.reduce('', String.concat),
      ),
    ),
    Option.getOrElse(() => ''),
  );
};
