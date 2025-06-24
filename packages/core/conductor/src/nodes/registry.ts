//
// Copyright 2025 DXOS.org
//

import { Effect, Schema, Stream } from 'effect';
import { JSONPath } from 'jsonpath-plus';

import {
  type AiServiceClient,
  DEFAULT_EDGE_MODEL,
  defineTool,
  type GenerateRequest,
  type GenerationStreamEvent,
  Message,
  MixedStreamParser,
  type Tool,
  ToolTypes,
} from '@dxos/ai';
import { makePushIterable } from '@dxos/async';
import { Type } from '@dxos/echo';
import { ATTR_TYPE, Filter, getTypename, isInstanceOf, ObjectId, toEffectSchema } from '@dxos/echo-schema';
import { AiService, DatabaseService, QueueService } from '@dxos/functions';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { KanbanType } from '@dxos/react-ui-kanban/types';
import { TableType } from '@dxos/react-ui-table/types';
import { safeParseJson } from '@dxos/util';

import { executeFunction, resolveFunctionPath } from './function';
import { NODE_INPUT, NODE_OUTPUT, inputNode, outputNode } from './system';
import { computeTemplate } from './template';
import {
  AppendInput,
  ConstantOutput,
  DatabaseOutput,
  GptInput,
  GptOutput,
  JsonTransformInput,
  QueueInput,
  QueueOutput,
  ReducerInput,
  ReducerOutput,
  TemplateInput,
  TemplateOutput,
  TextToImageOutput,
} from './types';
import { EventLogger } from '../services';
import {
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  AnyInput,
  AnyOutput,
  DefaultInput,
  type Executable,
  NotExecuted,
  VoidInput,
  VoidOutput,
  defineComputeNode,
  synchronizedComputeFunction,
  ValueBag,
} from '../types';

/**
 * To prototype a new compute node, first add a new type and a dummy definition (e.g., VoidInput, VoidOutput).
 */
// TODO(burdon): Convert to DXNs.
export type NodeType =
  | typeof NODE_INPUT
  | typeof NODE_OUTPUT
  | 'text-to-image' // TODO(burdon): Rename 'ai-image-tool'.
  | 'and'
  | 'append'
  | 'audio'
  | 'beacon'
  | 'chat'
  | 'constant'
  | 'database'
  | 'function'
  | 'gpt'
  | 'gpt-realtime'
  | 'if'
  | 'if-else'
  | 'json'
  | 'json-transform'
  | 'not'
  | 'or'
  | 'queue'
  | 'rng'
  | 'reducer'
  | 'scope'
  | 'surface'
  | 'switch'
  | 'template'
  | 'text'
  | 'thread';

export const isFalsy = (value: any) =>
  value === 'false' ||
  value === 'FALSE' ||
  value === '0' ||
  value === false ||
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0);

export const isTruthy = (value: any) => !isFalsy(value);

// TODO(dmaretskyi): Separate into definition and implementation.
export const registry: Record<NodeType, Executable> = {
  //
  // System
  //

  [NODE_INPUT]: inputNode,
  [NODE_OUTPUT]: outputNode,

  //
  // Inputs
  //

  ['audio' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.String }),
  }),

  ['chat' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.String }),
  }),

  ['constant' as const]: defineComputeNode({
    input: VoidInput,
    output: ConstantOutput,
    exec: (_, node) => Effect.succeed(ValueBag.make({ [DEFAULT_OUTPUT]: node!.value })),
  }),

  ['switch' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
  }),

  ['template' as const]: defineComputeNode({
    input: TemplateInput,
    output: TemplateOutput,
    exec: synchronizedComputeFunction((props = {}, node) => {
      invariant(node != null);
      const result = computeTemplate(node, props);
      return Effect.succeed({ [DEFAULT_OUTPUT]: result });
    }),
  }),

  ['rng' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Number }),
    exec: () => Effect.succeed(ValueBag.make({ [DEFAULT_OUTPUT]: Math.random() })),
  }),

  //
  // Outputs/views
  //

  ['beacon' as const]: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Boolean }),
    output: VoidOutput,
  }),

  ['scope' as const]: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.String }),
    output: VoidOutput,
  }),

  ['text' as const]: defineComputeNode({
    input: DefaultInput,
    output: VoidOutput,
  }),

  ['json' as const]: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Any }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  ['json-transform' as const]: defineComputeNode({
    input: JsonTransformInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input, expression }) => {
      const json =
        typeof input === 'string' ? safeParseJson(input, {}) : typeof input !== 'object' ? { value: input } : input;

      const result = JSONPath({ json, path: expression });
      return Effect.succeed({ [DEFAULT_OUTPUT]: result });
    }),
  }),

  ['surface' as const]: defineComputeNode({
    input: DefaultInput,
    output: VoidOutput,
  }),

  ['reducer' as const]: defineComputeNode({
    input: ReducerInput,
    output: ReducerOutput,
  }),

  ['thread' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({
      id: ObjectId,
      messages: Schema.Array(Message),
    }),
  }),

  ['queue' as const]: defineComputeNode({
    input: QueueInput,
    output: QueueOutput,
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: id }) =>
      Effect.gen(function* () {
        const { queues } = yield* QueueService;
        const messages = yield* Effect.promise(() => queues.get(DXN.parse(id)).queryObjects());

        const decoded = Schema.decodeUnknownSync(Schema.Any)(messages);
        return {
          [DEFAULT_OUTPUT]: decoded,
        };
      }),
    ),
  }),

  ['append' as const]: defineComputeNode({
    input: AppendInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(({ id, items }) =>
      Effect.gen(function* () {
        items = Array.isArray(items) ? items : [items];

        const dxn = DXN.parse(id);
        switch (dxn.kind) {
          case DXN.kind.QUEUE: {
            const mappedItems = items.map((item: any) => ({ ...item, id: item.id ?? ObjectId.random() }));

            const { queues } = yield* QueueService;
            yield* Effect.promise(() => queues.get(DXN.parse(id)).append(mappedItems));

            return {};
          }
          case DXN.kind.ECHO: {
            const { echoId, spaceId } = dxn.asEchoDXN() ?? failedInvariant();
            const { db } = yield* DatabaseService;
            if (spaceId != null) {
              invariant(db.spaceId === spaceId, 'Space mismatch');
            }

            const {
              objects: [container],
            } = yield* Effect.promise(() => db.query(Filter.ids(echoId)).run());
            if (isInstanceOf(TableType, container)) {
              const schema = yield* Effect.promise(async () =>
                db.schemaRegistry
                  .query({
                    typename: (await container.view?.load())?.query.typename,
                  })
                  .first(),
              );

              for (const item of items) {
                const { id: _id, '@type': _type, ...rest } = item as any;
                // TODO(dmaretskyi): Forbid type on create.
                db.add(live(schema, rest));
              }
              yield* Effect.promise(() => db.flush());
            } else if (isInstanceOf(KanbanType, container)) {
              const schema = yield* Effect.promise(async () =>
                db.schemaRegistry
                  .query({
                    typename: (await container.cardView?.load())?.query.typename,
                  })
                  .first(),
              );

              for (const item of items) {
                const { id: _id, '@type': _type, ...rest } = item as any;
                // TODO(dmaretskyi): Forbid type on create.
                db.add(live(schema, rest));
              }
              yield* Effect.promise(() => db.flush());
            } else {
              throw new Error(`Unsupported ECHO container type: ${getTypename(container)}`);
            }

            return {};
          }
          default: {
            throw new Error(`Unsupported DXN: ${dxn.toString()}`);
          }
        }
      }),
    ),
  }),

  //
  // Boolean ops.
  //

  ['and' as const]: defineComputeNode({
    input: Schema.Struct({ a: Schema.Boolean, b: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) && isTruthy(b) })),
  }),

  ['or' as const]: defineComputeNode({
    input: Schema.Struct({ a: Schema.Boolean, b: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) || isTruthy(b) })),
  }),

  ['not' as const]: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: !isTruthy(input) }),
    ),
  }),

  //
  // Logic ops.
  //

  ['if' as const]: defineComputeNode({
    input: Schema.Struct({ condition: Schema.Boolean, value: Schema.Any }),
    output: Schema.Struct({ true: Schema.optional(Schema.Any), false: Schema.optional(Schema.Any) }),
    exec: (input) =>
      Effect.gen(function* () {
        const { value, condition } = yield* ValueBag.unwrap(input);
        if (isTruthy(condition)) {
          return ValueBag.make({
            true: Effect.succeed(value),
            // TODO(burdon): Replace Effect.fail with Effect.succeedNone,
            false: Effect.fail(NotExecuted),
          });
        } else {
          return ValueBag.make({
            true: Effect.fail(NotExecuted),
            false: Effect.succeed(value),
          });
        }
      }),
  }),

  // Ternary operator.
  ['if-else' as const]: defineComputeNode({
    input: Schema.Struct({ condition: Schema.Boolean, true: Schema.Any, false: Schema.Any }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(condition) ? trueValue : falseValue }),
    ),
  }),

  //
  // Processing
  //

  ['function' as const]: defineComputeNode({
    input: AnyInput,
    output: AnyOutput,
    exec: synchronizedComputeFunction((input, node) =>
      Effect.gen(function* (): any {
        const functionRef = node?.function;
        if (!node || !functionRef) {
          throw new Error(`Function not specified on ${node?.id}.`);
        }
        const { path } = yield* Effect.tryPromise({
          try: () => resolveFunctionPath(functionRef),
          catch: (e) => e,
        });

        const outputSchema = node.outputSchema ? toEffectSchema(node.outputSchema) : AnyOutput;
        return executeFunction(path, input, outputSchema);
      }),
    ),
  }),

  ['gpt' as const]: defineComputeNode({
    input: GptInput,
    output: GptOutput,
    exec: (input) =>
      Effect.gen(function* () {
        const { systemPrompt, prompt, history = [], tools = [] } = yield* ValueBag.unwrap(input);
        const { client: aiClient } = yield* AiService;

        const messages: Message[] = [
          ...history,
          {
            id: ObjectId.random(),
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ];

        log.info('generating', { systemPrompt, prompt, history, tools: tools.map((tool) => tool.name) });
        const generationStream = yield* Effect.promise(() =>
          generate(aiClient, {
            model: DEFAULT_EDGE_MODEL,
            history: messages,
            systemPrompt,
            tools: tools as Tool[],
          }),
        );
        const logger = yield* EventLogger;

        const stream = Stream.fromAsyncIterable(generationStream, (e) => new Error(String(e))).pipe(
          Stream.tap((event) => {
            logger.log({
              type: 'custom',
              nodeId: logger.nodeId!,
              event,
            });
            return Effect.void;
          }),
        );

        // Separate tokens into a separate stream.
        const [resultStream, tokenStream] = yield* Stream.broadcast(stream, 2, { capacity: 'unbounded' });

        const outputMessages = yield* resultStream.pipe(
          Stream.runDrain,
          Effect.map(() => generationStream.result),
          Effect.cached, // Cache the result to avoid re-draining the stream.
        );

        const outputWithAPrompt = outputMessages.pipe(
          Effect.map((messages) =>
            // TODO(dmaretskyi): Why do we need to prepend the last message
            [messages.at(-1)!, ...messages].map((msg) => ({
              [ATTR_TYPE]: Type.getDXN(Message),
              ...msg,
            })),
          ),
        );

        const text = outputWithAPrompt.pipe(
          Effect.map((messages) =>
            messages
              .map((message) => message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])))
              .join(''),
          ),
        );

        const cot = outputWithAPrompt.pipe(
          Effect.map(
            (messages) =>
              messages
                .at(-1)!
                .content.filter((block) => block.type === 'text')
                .find((block) => block.disposition === 'cot')?.text,
          ),
        );

        const artifact = Effect.gen(function* () {
          const output = yield* outputMessages;
          const textContent = yield* text;
          const begin = textContent.lastIndexOf('<artifact>');
          const end = textContent.indexOf('</artifact>');
          if (begin === -1 || end === -1) {
            return undefined;
          }

          const artifactData = textContent.slice(begin + '<artifact>'.length, end).trim();

          return artifactData;
        });

        // TODO(burdon): Parse COT on the server (message ontology).
        return ValueBag.make<GptOutput>({
          messages: outputWithAPrompt,
          tokenCount: 0,
          text,
          tokenStream,
          cot,
          artifact,
        });
      }),
  }),

  ['gpt-realtime' as const]: defineComputeNode({
    input: Schema.Struct({
      audio: Schema.Any,
    }),
    output: VoidOutput,
    exec: synchronizedComputeFunction(() => Effect.succeed({})),
  }),

  //
  // Tools
  //

  // TODO(burdon): Rename 'echo' (since we may have other dbs).
  ['database' as const]: defineComputeNode({
    input: VoidInput,
    output: DatabaseOutput,
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),

  ['text-to-image' as const]: defineComputeNode({
    input: VoidInput,
    output: TextToImageOutput,
    exec: synchronizedComputeFunction(() => Effect.succeed({ [DEFAULT_OUTPUT]: [textToImageTool] })),
  }),
};

const textToImageTool: Tool = defineTool('testing', {
  name: 'text-to-image',
  type: ToolTypes.TextToImage,
  options: {
    // TODO(burdon): Testing.
    // model: '@testing/kitten-in-bubble',
  },
});

const generate = async (
  ai: AiServiceClient,
  generationRequest: GenerateRequest,
  { abort }: { abort?: AbortSignal } = {},
): Promise<GenerateResult> => {
  const stream = await ai.execStream(generationRequest);
  const parser = new MixedStreamParser();
  const resultIterable = makePushIterable<GenerationStreamEvent>();

  let completed = false;
  parser.streamEvent.on((event) => {
    log.info('stream event', { event });
    resultIterable.next(event);
  });
  const messages = await parser.parse(stream);
  completed = true;

  resultIterable.return(messages);

  abort?.addEventListener('abort', () => {
    if (!completed) {
      resultIterable.throw(new Error('Aborted'));
    }
  });

  return {
    [Symbol.asyncIterator]: resultIterable[Symbol.asyncIterator],
    get result() {
      if (!completed) {
        throw new Error('Iterable not completed');
      }

      return messages;
    },
  };
};

interface GenerateResult extends AsyncIterable<GenerationStreamEvent> {
  /**
   * @throws If the iterable is not completed.
   */
  get result(): Message[];
}
