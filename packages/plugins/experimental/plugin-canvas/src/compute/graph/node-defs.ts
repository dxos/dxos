//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { LLMTool, Message, ToolTypes } from '@dxos/assistant';
import {
  type ComputeNode,
  type Executable,
  GptService,
  NotExecuted,
  defineComputeNode,
  gptNode,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
} from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { ObjectId, S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { DEFAULT_INPUT, DEFAULT_OUTPUT, DefaultInput, DefaultOutput, VoidInput, VoidOutput } from './types';
// TODO(burdon): Push down defs to here.
import { type ComputeShape, type ConstantShape } from '../shapes';

type NodeType =
  | 'and'
  | 'append'
  | 'audio'
  | 'beacon'
  | 'chat'
  | 'constant'
  | 'database'
  | 'gpt'
  | 'gpt-realtime'
  | 'if'
  | 'if-else'
  | 'list'
  | 'not'
  | 'or'
  | 'scope'
  | 'switch'
  | 'text'
  | 'text-to-image'
  | 'thread'
  | 'view';

// TODO(burdon): Just pass in type? Or can the shape specialize the node?
export const createComputeNode = (shape: GraphNode<ComputeShape>): GraphNode<ComputeNode> => {
  const type = shape.data.type;
  const factory =
    nodeFactory[type ?? raise(new Error('Type not specified'))] ?? raise(new Error(`Unknown shape type: ${type}`));
  return factory(shape);
};

const createNode = (type: string, props?: Partial<ComputeNode>) => ({
  // TODO(burdon): Don't need to create id here?
  id: ObjectId.random(),
  type, // TODO(burdon): Don't put type on both node and data.
  data: {
    type,
    ...props,
  },
});

// TODO(burdon): Reconcile with ShapeRegistry.
const nodeFactory: Record<string, (shape: GraphNode<ComputeShape>) => GraphNode<ComputeNode>> = {
  ['and' as const]: () => createNode('and'),
  ['append' as const]: () => createNode('append'),
  ['audio' as const]: () => createNode('audio'),
  ['beacon' as const]: () => createNode('beacon'),
  ['chat' as const]: () => createNode('chat'),
  ['constant' as const]: (shape) => createNode('constant', { constant: (shape.data as ConstantShape).value }),
  ['database' as const]: () => createNode('database'),
  ['gpt' as const]: () => createNode('gpt'),
  ['gpt-realtime' as const]: () => createNode('gpt-realtime'),
  ['if' as const]: () => createNode('if'),
  ['if-else' as const]: () => createNode('if-else'),
  ['json' as const]: () => createNode('view'),
  ['list' as const]: () => createNode('list'),
  ['not' as const]: () => createNode('not'),
  ['or' as const]: () => createNode('or'),
  ['scope' as const]: () => createNode('scope'),
  ['switch' as const]: () => createNode('switch'),
  ['text' as const]: () => createNode('text'),
  ['text-to-image' as const]: () => createNode('text-to-image'),
  ['thread' as const]: () => createNode('thread'),
  ['view' as const]: () => createNode('view'),
};

export const resolveComputeNode = async (node: ComputeNode): Promise<Executable> => {
  const impl = nodeDefs[node.type as NodeType];
  invariant(impl, `Unknown node type: ${node.type}`);
  return impl;
};

export const ListInput = S.Struct({ [DEFAULT_INPUT]: ObjectId });
export const ListOutput = S.Struct({ id: ObjectId, items: S.Array(Message) });

export const AppendInput = S.Struct({ id: ObjectId, items: S.Array(Message) });
export const DatabaseOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });
export const TextToImageOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });

// TODO(burdon): Create wrapper functions.
const nodeDefs: Record<NodeType, Executable> = {
  // Controls.
  ['switch' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),
  ['text' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),
  ['audio' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  // Views.
  ['beacon' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: VoidOutput,
  }),
  ['scope' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.String }),
    output: VoidOutput,
  }),

  // Boolean ops.
  ['and' as const]: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a && b })),
  }),
  ['or' as const]: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a || b })),
  }),
  ['not' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: !input })),
  }),

  // Logic ops.
  ['if' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, value: S.Any }),
    output: S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }),
    exec: (input) =>
      Effect.gen(function* () {
        const { value, condition } = yield* unwrapValueBag(input);
        if (condition) {
          return makeValueBag({
            true: Effect.succeed(value),
            false: Effect.fail(NotExecuted),
          });
        } else {
          return makeValueBag({
            true: Effect.fail(NotExecuted),
            false: Effect.succeed(value),
          });
        }
      }),
  }),

  // TODO(dmaretskyi): Rename select.
  ['if-else' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: condition ? trueValue : falseValue }),
    ),
  }),

  ['constant' as const]: defineComputeNode({
    input: VoidInput,
    output: DefaultOutput,
    exec: (_inputs, node) => Effect.succeed(makeValueBag({ [DEFAULT_OUTPUT]: node!.constant })),
  }),

  ['view' as const]: defineComputeNode({
    input: DefaultInput,
    output: DefaultOutput,
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  // TODO(dmaretskyi): Consider moving gpt out of conductor.
  ['chat' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  ['thread' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({
      id: ObjectId,
      messages: S.Array(Message),
    }),
  }),

  ['list' as const]: defineComputeNode({
    input: ListInput,
    output: ListOutput,
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: id }) =>
      Effect.gen(function* () {
        const gptService = yield* GptService;
        const aiClient = (gptService.getAiServiceClient ?? failedInvariant())();

        const messages = yield* Effect.promise(() => aiClient.getMessagesInThread(FAKE_SPACE_ID, id));

        log.info('getMessagesInThread', { id, messages });

        return {
          id,
          items: messages,
        };
      }),
    ),
  }),

  ['append' as const]: defineComputeNode({
    input: AppendInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(({ id, items }) =>
      Effect.gen(function* () {
        const gptService = yield* GptService;
        const aiClient = (gptService.getAiServiceClient ?? failedInvariant())();

        invariant(ObjectId.isValid(id), 'Invalid thread id');

        const toInsert = items.map(
          (message): Message => ({
            ...message,
            spaceId: FAKE_SPACE_ID,
            threadId: id as any, // TODO(dmaretskyi): Assistant has its own object id definition.
            foreignId: undefined,
          }),
        );

        log.info('insertMessages', { id, toInsert });
        yield* Effect.promise(() => aiClient.insertMessages(toInsert));
        return {};
      }),
    ),
  }),

  ['gpt' as const]: gptNode,
  ['gpt-realtime' as const]: defineComputeNode({
    input: S.Struct({
      audio: S.Any,
    }),
    output: VoidOutput,
    exec: synchronizedComputeFunction(() => Effect.succeed({})),
  }),

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

// TODO(dmaretskyi): Have to hardcode this since ai-service requires spaceId.
const FAKE_SPACE_ID = SpaceId.random();

const textToImageTool: LLMTool = {
  name: 'textToImage',
  type: ToolTypes.TextToImage,
  options: {
    // TODO(burdon): Testing.
    // model: '@testing/kitten-in-bubble',
  },
};
