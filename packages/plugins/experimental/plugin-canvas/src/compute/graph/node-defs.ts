//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { LLMTool, Message, ToolTypes } from '@dxos/assistant';
import {
  type ComputeNode,
  type Executable,
  GptService,
  defineComputeNode,
  gptNode,
  makeValueBag,
  synchronizedComputeFunction,
} from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { ObjectId, S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './types';
// TODO(burdon): Push down defs to here.
import { type ComputeShape, type ConstantShape } from '../shapes';

type NodeType =
  | 'switch'
  | 'text'
  | 'beacon'
  | 'and'
  | 'or'
  | 'not'
  | 'if'
  | 'if-else'
  | 'gpt'
  | 'chat'
  | 'view'
  | 'thread'
  | 'constant'
  | 'list'
  | 'append'
  | 'database'
  | 'text-to-image';

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
  // Controls.
  ['switch' as const]: () => createNode('switch'),
  ['text' as const]: () => createNode('text'),

  // Views.
  ['beacon' as const]: () => createNode('beacon'),

  // Boolean ops.
  ['and' as const]: () => createNode('and'),
  ['or' as const]: () => createNode('or'),
  ['not' as const]: () => createNode('not'),

  // Logic ops.
  ['if' as const]: () => createNode('if'),
  ['if-else' as const]: () => createNode('if-else'),

  ['gpt' as const]: () => createNode('gpt'),

  ['json' as const]: () => createNode('view'),
  ['chat' as const]: () => createNode('chat'),
  ['view' as const]: () => createNode('view'),
  ['thread' as const]: () => createNode('thread'),
  ['constant' as const]: (shape) => createNode('constant', { constant: (shape.data as ConstantShape).value }),
  ['list' as const]: () => createNode('list'),
  ['append' as const]: () => createNode('append'),
  ['database' as const]: () => createNode('database'),
  ['text-to-image' as const]: () => createNode('text-to-image'),
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

const nodeDefs: Record<NodeType, Executable> = {
  // Controls.
  ['switch' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),
  ['text' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  // Views.
  ['beacon' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({}),
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
  // TODO(dmaretskyi): This is wrong.
  //                   The other output should get the not-executed signal.
  ['if' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, value: S.Any }),
    output: S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }),
    exec: synchronizedComputeFunction(({ condition, value }) =>
      Effect.succeed(condition ? { true: value } : { false: value }),
    ),
  }),

  // TODO(dmaretskyi): Rename select.
  ['if-else' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: condition ? trueValue : falseValue }),
    ),
  }),

  // Generic.
  ['constant' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: (_inputs, node) => Effect.succeed(makeValueBag({ [DEFAULT_OUTPUT]: node!.constant })),
  }),
  ['view' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  // TODO(dmaretskyi): Consider moving gpt out of conductor.
  ['chat' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),
  ['thread' as const]: defineComputeNode({
    input: S.Struct({}),
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
    output: S.Struct({}),
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

  ['database' as const]: defineComputeNode({
    input: S.Struct({}),
    output: DatabaseOutput,
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),

  ['text-to-image' as const]: defineComputeNode({
    input: S.Struct({}),
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
    model: '@testing/kitten-in-bubble',
  },
};
