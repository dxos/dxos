//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { JSONPath } from 'jsonpath-plus';

import { type LLMTool, Message, ToolTypes } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { safeParseJson } from '@dxos/util';

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
  TextToImageOutput,
  TriggerInput,
  TriggerOutput,
} from './types';
import { GptService, EdgeClientService } from '../services';
import {
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  AnyInput,
  AnyOutput,
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
  | 'map'
  | 'not'
  | 'or'
  | 'queue'
  | 'rng'
  | 'reducer'
  | 'scope'
  | 'switch'
  | 'text'
  | 'trigger'
  | 'thread'
  | 'view';

export const isFalsy = (value: any) =>
  value === 'false' ||
  value === 'FALSE' ||
  value === '0' ||
  value === false ||
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0);

export const isTruthy = (value: any) => !isFalsy(value);

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
      const json =
        typeof input === 'string' ? safeParseJson(input, {}) : typeof input !== 'object' ? { value: input } : input;

      const result = JSONPath({ json, path: expression });
      return Effect.succeed({ [DEFAULT_OUTPUT]: result });
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

  ['queue' as const]: defineComputeNode({
    input: QueueInput,
    output: QueueOutput,
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
        const { subspaceTag, spaceId, queueId } = DXN.parse(id).asQueueDXN() ?? failedInvariant('Invalid queue DXN');
        invariant(SpaceId.isValid(spaceId), 'invalid space id');
        invariant(ObjectId.isValid(queueId), 'invalid queue id');

        const mappedItems = items.map((item) => ({ ...item, id: item.id ?? ObjectId.random() }));
        log.info('insert', { subspaceTag, spaceId, queueId, items: mappedItems });

        const edgeClientService = yield* EdgeClientService;
        const edgeClient = edgeClientService.getEdgeHttpClient();
        yield* Effect.promise(() =>
          edgeClient.insertIntoQueue(subspaceTag, spaceId, queueId, mappedItems as unknown[]),
        );
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
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) && isTruthy(b) })),
  }),

  ['or' as const]: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) || isTruthy(b) })),
  }),

  ['not' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: !isTruthy(input) }),
    ),
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
        if (isTruthy(condition)) {
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
      Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(condition) ? trueValue : falseValue }),
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

const textToImageTool: LLMTool = {
  name: 'textToImage',
  type: ToolTypes.TextToImage,
  options: {
    // TODO(burdon): Testing.
    // model: '@testing/kitten-in-bubble',
  },
};
