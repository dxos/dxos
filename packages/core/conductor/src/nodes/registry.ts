//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { JSONPath } from 'jsonpath-plus';

import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { isInstanceOf } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { FunctionDefinition, FunctionInvocationService, QueueService } from '@dxos/functions';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Message } from '@dxos/types';
import { safeParseJson } from '@dxos/util';

import {
  AnyInput,
  AnyOutput,
  AppendInput,
  ConstantOutput,
  DEFAULT_INPUT,
  DEFAULT_OUTPUT,
  DefaultInput,
  type Executable,
  JsonTransformInput,
  NotExecuted,
  QueueInput,
  QueueOutput,
  ReducerInput,
  ReducerOutput,
  ValueBag,
  VoidInput,
  VoidOutput,
  defineComputeNode,
  synchronizedComputeFunction,
} from '../types';

import { gptNode } from './gpt';
import { NODE_INPUT, NODE_OUTPUT, inputNode, outputNode } from './system';
import { templateNode } from './template';

export const isFalsy = (value: any) =>
  value === 'false' ||
  value === 'FALSE' ||
  value === '0' ||
  value === false ||
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0);

export const isTruthy = (value: any) => !isFalsy(value);

/**
 * To prototype a new compute node, first add a new type and a dummy definition (e.g., VoidInput, VoidOutput).
 */
// TODO(burdon): Extensible? (use dxn: prefix?)
// TODO(burdon): Add type to node def and create discriminated union.
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
  | 'make-queue'
  | 'reducer'
  | 'scope'
  | 'surface'
  | 'switch'
  | 'template'
  | 'text'
  | 'thread';

// TODO(burdon): Extensible?
export const registry: Record<NodeType, Executable> = {
  //
  // System
  //

  [NODE_INPUT]: inputNode,
  [NODE_OUTPUT]: outputNode,

  //
  // Inputs
  //

  // TODO(burdon): Template?
  ['template' as const]: templateNode,

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

  ['rng' as const]: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Number }),
    exec: () => Effect.succeed(ValueBag.make({ [DEFAULT_OUTPUT]: Math.random() })),
  }),

  // Creates a new queue.
  ['make-queue' as const]: defineComputeNode({
    input: Schema.Struct({}),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Type.Ref(Queue) }),
    exec: synchronizedComputeFunction(
      Effect.fnUntraced(function* () {
        const { queues } = yield* QueueService;
        const queue = queues.create();
        return {
          [DEFAULT_OUTPUT]: Ref.fromDXN(queue.dxn),
        };
      }),
    ),
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
      messages: Schema.Array(Message.Message),
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
            const mappedItems = items.map((item: any) => ({
              ...item,
              id: item.id ?? ObjectId.random(),
            }));
            const { queues } = yield* QueueService;
            yield* Effect.promise(() => queues.get(DXN.parse(id)).append(mappedItems));
            return {};
          }

          case DXN.kind.ECHO: {
            const { echoId, spaceId } = dxn.asEchoDXN() ?? failedInvariant();
            const { db } = yield* Database.Service;
            if (spaceId != null) {
              invariant(db.spaceId === spaceId, 'Space mismatch');
            }

            const [container] = yield* Effect.promise(() => db.query(Filter.id(echoId)).run());
            if (isInstanceOf(View.View, container)) {
              const schema = yield* Effect.promise(async () =>
                db.schemaRegistry
                  .query({
                    typename: getTypenameFromQuery(container.query.ast),
                  })
                  .first(),
              );

              for (const item of items) {
                const { id: _id, '@type': _type, ...rest } = item as any;
                // TODO(dmaretskyi): Forbid type on create.
                db.add(Obj.make(schema, rest));
              }
              yield* Effect.promise(() => db.flush());
            } else {
              throw new Error(`Unsupported ECHO container type: ${Obj.getTypename(container)}`);
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
      Effect.succeed({ [DEFAULT_OUTPUT]: isFalsy(input) }),
    ),
  }),

  //
  // Logic ops.
  //

  ['if' as const]: defineComputeNode({
    input: Schema.Struct({ condition: Schema.Boolean, value: Schema.Any }),
    output: Schema.Struct({
      true: Schema.optional(Schema.Any),
      false: Schema.optional(Schema.Any),
    }),
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
    input: Schema.Struct({
      condition: Schema.Boolean,
      true: Schema.Any,
      false: Schema.Any,
    }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({
        [DEFAULT_OUTPUT]: isTruthy(condition) ? trueValue : falseValue,
      }),
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

        const func = yield* Database.Service.load(functionRef);
        const funcDefinition = FunctionDefinition.deserialize(func);
        return yield* FunctionInvocationService.invokeFunction(funcDefinition, input);
      }),
    ),
  }),

  ['gpt' as const]: gptNode,

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
    output: VoidOutput, // TODO(burdon): Fix.
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),

  // TODO(burdon): Fix.
  ['text-to-image' as const]: defineComputeNode({
    input: VoidInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),
};
