//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type LLMTool, Message, ToolTypes } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  AppendInput,
  ConstantOutput,
  DatabaseOutput,
  GptInput,
  GptOutput,
  JsonTransformInput,
  ListInput,
  ListOutput,
  ReducerInput,
  ReducerOutput,
  TextToImageOutput,
  TriggerInput,
  TriggerOutput,
} from './types';
import { GptService, EdgeClientService } from '../services';
import {
  AnyInput,
  AnyOutput,
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  DefaultInput,
  DefaultOutput,
  type Executable,
  NotExecuted,
  VoidInput,
  VoidOutput,
  defineComputeNode,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
} from '../types';

/**
 * To prototype a new compute node, first add a new type and a dummy definition (e.g., VoidInput, VoidOutput).
 */
// TODO(burdon): Convert to DXNs.
export type NodeType =
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
  | 'list'
  | 'map'
  | 'not'
  | 'or'
  | 'rng'
  | 'reducer'
  | 'scope'
  | 'switch'
  | 'text'
  | 'text-to-image'
  | 'trigger'
  | 'thread'
  | 'view';

export const registry: Record<NodeType, Executable> = {
  //
  // Inputs
  //

  ['audio' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  ['chat' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  ['constant' as const]: defineComputeNode({
    input: VoidInput,
    output: ConstantOutput,
    exec: (_, node) => Effect.succeed(makeValueBag({ [DEFAULT_OUTPUT]: node!.value })),
  }),

  ['switch' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),

  ['text' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  ['trigger' as const]: defineComputeNode({
    input: TriggerInput,
    output: TriggerOutput,
  }),

  ['rng' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Number }),
    exec: () => Effect.succeed(makeValueBag({ [DEFAULT_OUTPUT]: Math.random() })),
  }),

  //
  // Outputs/views
  //

  ['beacon' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: VoidOutput,
  }),

  ['scope' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.String }),
    output: VoidOutput,
  }),

  ['view' as const]: defineComputeNode({
    input: DefaultInput,
    output: DefaultOutput,
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  ['json' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  ['json-transform' as const]: defineComputeNode({
    input: JsonTransformInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input, expression }) => {
      console.log(input, expression);
      return Effect.succeed({ [DEFAULT_OUTPUT]: input });
    }),
  }),

  ['reducer' as const]: defineComputeNode({
    input: ReducerInput,
    output: ReducerOutput,
  }),

  ['map' as const]: defineComputeNode({
    input: AnyInput,
    output: VoidOutput,
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
        const { subspaceTag, spaceId, queueId } = DXN.parse(id).asQueueDXN() ?? failedInvariant('Invalid queue DXN');
        invariant(SpaceId.isValid(spaceId), 'Invalid space id');
        invariant(ObjectId.isValid(queueId), 'Invalid queue id');

        const edgeClientService = yield* EdgeClientService;
        const edgeClient = edgeClientService.getEdgeHttpClient();
        const { objects: messages } = yield* Effect.promise(() =>
          edgeClient.queryQueue(subspaceTag, spaceId, { queueId }),
        );

        const decoded = S.decodeUnknownSync(S.Array(Message))(messages);
        return {
          id,
          items: decoded,
        };
      }),
    ),
  }),

  ['append' as const]: defineComputeNode({
    input: AppendInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(({ id, items }) =>
      Effect.gen(function* () {
        const { subspaceTag, spaceId, queueId } = DXN.parse(id).asQueueDXN() ?? failedInvariant('Invalid queue DXN');
        invariant(SpaceId.isValid(spaceId), 'Invalid space id');
        invariant(ObjectId.isValid(queueId), 'Invalid queue id');

        const edgeClientService = yield* EdgeClientService;
        const edgeClient = edgeClientService.getEdgeHttpClient();

        const toInsert = items.map((item) => ({
          ...item,
          id: item.id ?? ObjectId.random(),
        }));

        log.info('insertIntoQueue', { subspaceTag, spaceId, queueId, items: toInsert });
        yield* Effect.promise(() => edgeClient.insertIntoQueue(subspaceTag, spaceId, queueId, toInsert as unknown[]));
        return {};
      }),
    ),
  }),

  //
  // Boolean ops.
  //

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

  //
  // Logic ops.
  //

  ['if' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, value: S.Any }),
    output: S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }),
    exec: (input) =>
      Effect.gen(function* () {
        const { value, condition } = yield* unwrapValueBag(input);
        if (condition) {
          return makeValueBag({
            true: Effect.succeed(value),
            // TODO(burdon): Replace Effect.fail with Effect.succeedNone,
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

  // Ternary operator.
  ['if-else' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: condition ? trueValue : falseValue }),
    ),
  }),

  //
  // Processing
  //

  ['function' as const]: defineComputeNode({
    input: AnyInput,
    output: AnyOutput,
  }),

  ['gpt' as const]: defineComputeNode({
    input: GptInput,
    output: GptOutput,
    exec: (input) =>
      Effect.gen(function* () {
        const gpt = yield* GptService;
        return yield* gpt.invoke(input);
      }),
  }),

  ['gpt-realtime' as const]: defineComputeNode({
    input: S.Struct({
      audio: S.Any,
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
