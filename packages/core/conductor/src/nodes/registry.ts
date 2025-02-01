//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { JSONPath } from 'jsonpath-plus';

import { type Tool, Message } from '@dxos/artifact';
import { ToolTypes } from '@dxos/assistant';
import { isInstanceOf, ObjectId, S } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { TableType } from '@dxos/react-ui-table/types';
import { safeParseJson } from '@dxos/util';

import { NODE_INPUT, NODE_OUTPUT, inputNode, outputNode } from './system';
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
import { GptService, QueueService, SpaceService } from '../services';
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
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
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
  | 'counter'
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

  ['template' as const]: defineComputeNode({
    input: TemplateInput,
    output: TemplateOutput,
    exec: synchronizedComputeFunction((props = {}, node) => {
      const unresolved: string[] = [];
      const text = node?.value?.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
        if (props[p1]) {
          return props[p1];
        } else {
          unresolved.push(p1);
          return match;
        }
      });

      if (unresolved.length > 0) {
        return Effect.fail(new Error(`Unresolved properties: [${unresolved.join(', ')}]`));
      }

      return Effect.succeed({ [DEFAULT_OUTPUT]: text });
    }),
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

  // TODO(burdon): Can this maintain state?
  ['counter' as const]: defineComputeNode({
    input: DefaultInput,
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Number }),
  }),

  ['scope' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.String }),
    output: VoidOutput,
  }),

  ['text' as const]: defineComputeNode({
    input: DefaultInput,
    output: VoidOutput,
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
        const edgeClientService = yield* QueueService;
        const { objects: messages } = yield* Effect.promise(() => edgeClientService.queryQueue(DXN.parse(id)));

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
        const dxn = DXN.parse(id);
        switch (dxn.kind) {
          case DXN.kind.QUEUE: {
            const mappedItems = items.map((item) => ({ ...item, id: item.id ?? ObjectId.random() }));

            const edgeClientService = yield* QueueService;
            yield* Effect.promise(() => edgeClientService.insertIntoQueue(DXN.parse(id), mappedItems));

            return {};
          }
          case DXN.kind.ECHO: {
            const { echoId, spaceId } = dxn.asEchoDXN() ?? failedInvariant();
            const spaceService = yield* SpaceService;
            if (spaceId != null) {
              invariant(spaceService.spaceId === spaceId, 'Space mismatch');
            }

            const {
              objects: [container],
            } = yield* Effect.promise(() => spaceService.db.query({ id: echoId }).run());
            if (isInstanceOf(TableType, container)) {
              const schema = yield* Effect.promise(async () =>
                spaceService.db.schemaRegistry
                  .query({
                    typename: (await container.view?.load())?.query.type,
                  })
                  .first(),
              );

              for (const item of items) {
                const { id: _id, '@type': _type, ...rest } = item as any;
                // TODO(dmaretskyi): Forbid type on create.
                spaceService.db.add(create(schema, rest));
              }
              yield* Effect.promise(() => spaceService.db.flush());
            } else {
              throw new Error('Unsupported ECHO container type');
            }

            return {};
          }
          default: {
            throw new Error('Unsupported DXN');
          }
        }
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

const textToImageTool: Tool = {
  name: 'textToImage',
  type: ToolTypes.TextToImage,
  options: {
    // TODO(burdon): Testing.
    // model: '@testing/kitten-in-bubble',
  },
};
