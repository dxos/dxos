//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type LLMTool, Message, ToolTypes } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AppendInput, DatabaseOutput, GptInput, GptOutput, ListInput, ListOutput, TextToImageOutput } from './types';
import { GptService } from '../services';
import {
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  DefaultInput,
  DefaultOutput,
  type Executable,
  VoidInput,
  VoidOutput,
  defineComputeNode,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
  NotExecuted,
} from '../types';

// TODO(burdon): Convert to DXNs.
export type NodeType =
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
  | 'json'
  | 'list'
  | 'not'
  | 'or'
  | 'scope'
  | 'switch'
  | 'text'
  | 'text-to-image'
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
    output: DefaultOutput,
    exec: (_inputs, node) => Effect.succeed(makeValueBag({ [DEFAULT_OUTPUT]: node!.constant })),
  }),

  ['switch' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),

  ['text' as const]: defineComputeNode({
    input: VoidInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  //
  // Outputs
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
            // TODO(burdon): Should not call fail since that would indicate an error. Special NotExecuted value?
            false: Effect.succeed(NotExecuted),
          });
        } else {
          return makeValueBag({
            true: Effect.succeed(NotExecuted),
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
