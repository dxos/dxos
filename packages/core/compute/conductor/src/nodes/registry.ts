//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { JSONPath } from 'jsonpath-plus';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Type, View } from '@dxos/echo';
import { isInstanceOf } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EchoURI, ObjectId } from '@dxos/keys';
import { getTypenameFromQuery } from '@dxos/schema';
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
  template: templateNode,

  audio: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.String }),
  }),

  chat: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.String }),
  }),

  constant: defineComputeNode({
    input: VoidInput,
    output: ConstantOutput,
    exec: (_, node) => Effect.succeed(ValueBag.make({ [DEFAULT_OUTPUT]: node!.value })),
  }),

  switch: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
  }),

  rng: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Number }),
    exec: () => Effect.succeed(ValueBag.make({ [DEFAULT_OUTPUT]: Math.random() })),
  }),

  // Creates a new feed.
  'make-queue': defineComputeNode({
    input: Schema.Struct({}),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Ref.Ref(Feed.Feed) }),
    exec: synchronizedComputeFunction(
      Effect.fnUntraced(function* () {
        const feed = yield* Database.add(Feed.make());
        return {
          [DEFAULT_OUTPUT]: Ref.make(feed),
        };
      }),
    ),
  }),

  //
  // Outputs/views
  //

  beacon: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Boolean }),
    output: VoidOutput,
  }),

  scope: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.String }),
    output: VoidOutput,
  }),

  text: defineComputeNode({
    input: DefaultInput,
    output: VoidOutput,
  }),

  json: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Any }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: input })),
  }),

  'json-transform': defineComputeNode({
    input: JsonTransformInput,
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input, expression }) => {
      const json =
        typeof input === 'string' ? safeParseJson(input, {}) : typeof input !== 'object' ? { value: input } : input;
      const result = JSONPath({ json, path: expression });
      return Effect.succeed({ [DEFAULT_OUTPUT]: result });
    }),
  }),

  surface: defineComputeNode({
    input: DefaultInput,
    output: VoidOutput,
  }),

  reducer: defineComputeNode({
    input: ReducerInput,
    output: ReducerOutput,
  }),

  thread: defineComputeNode({
    input: VoidInput,
    output: Schema.Struct({
      id: ObjectId,
      messages: Schema.Array(Type.getSchema(Message.Message)),
    }),
  }),

  queue: defineComputeNode({
    input: QueueInput,
    output: QueueOutput,
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: id }) =>
      Effect.gen(function* () {
        const feed = yield* Database.resolve(EchoURI.parse(id), Feed.Feed).pipe(Effect.orDie);
        const messages = yield* Feed.runQuery(feed, Filter.everything());
        const decoded = Schema.decodeUnknownSync(Schema.Any)(messages);
        return {
          [DEFAULT_OUTPUT]: decoded,
        };
      }),
    ),
  }),

  append: defineComputeNode({
    input: AppendInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(({ id, items }) =>
      Effect.gen(function* () {
        items = Array.isArray(items) ? items : [items];
        // Legacy `dxn:queue:` URIs identify a feed/queue; everything else is an ECHO container.
        if (typeof id === 'string' && id.startsWith('dxn:queue:')) {
          const mappedItems = items.map((item: any) => ({
            ...item,
            id: item.id ?? ObjectId.random(),
          }));
          const feed = yield* Database.resolve(EchoURI.parse(id), Feed.Feed).pipe(Effect.orDie);
          yield* Feed.append(feed, mappedItems);
          return {};
        } else {
          const echoUri = EchoURI.parse(id);
          const echoId = EchoURI.getObjectId(echoUri);
          const spaceId = EchoURI.getSpaceId(echoUri);
          invariant(echoId, 'Object ID missing from EchoURI');
          const { db } = yield* Database.Service;
          if (spaceId != null) {
            invariant(db.spaceId === spaceId, 'Space mismatch');
          }

          const [container] = yield* Effect.promise(() => db.query(Filter.id(echoId)).run());
          if (isInstanceOf(View.View, container)) {
            const schemaTypename = getTypenameFromQuery(container.query.ast);
            const schema = db.graph.registry.types.find((t) => Type.getTypename(t) === schemaTypename);
            invariant(schema, `Schema not found: ${schemaTypename}`);

            for (const item of items) {
              const { id: _id, '@type': _type, ...rest } = item as any;
              // TODO(dmaretskyi): Forbid type on create.
              db.add(Obj.make(schema as any, rest));
            }
            yield* Effect.promise(() => db.flush());
          } else {
            throw new Error(`Unsupported ECHO container type: ${Obj.getTypename(container)}`);
          }

          return {};
        }
      }),
    ),
  }),

  //
  // Boolean ops.
  //

  and: defineComputeNode({
    input: Schema.Struct({ a: Schema.Boolean, b: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) && isTruthy(b) })),
  }),

  or: defineComputeNode({
    input: Schema.Struct({ a: Schema.Boolean, b: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: isTruthy(a) || isTruthy(b) })),
  }),

  not: defineComputeNode({
    input: Schema.Struct({ [DEFAULT_INPUT]: Schema.Boolean }),
    output: Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Boolean }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: isFalsy(input) }),
    ),
  }),

  //
  // Logic ops.
  //

  if: defineComputeNode({
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
  'if-else': defineComputeNode({
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

  function: defineComputeNode({
    input: AnyInput,
    output: AnyOutput,
    exec: synchronizedComputeFunction((input, node) =>
      Effect.gen(function* (): any {
        const functionRef = node?.function;
        if (!node || !functionRef) {
          throw new Error(`Function not specified on ${node?.id}.`);
        }

        const func = yield* Database.load(functionRef);
        const funcDefinition = Operation.deserialize(func);
        return yield* Operation.invoke(funcDefinition, input).pipe(Effect.orDie);
      }),
    ),
  }),

  gpt: gptNode,

  'gpt-realtime': defineComputeNode({
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
  database: defineComputeNode({
    input: VoidInput,
    output: VoidOutput, // TODO(burdon): Fix.
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),

  // TODO(burdon): Fix.
  'text-to-image': defineComputeNode({
    input: VoidInput,
    output: VoidOutput,
    exec: synchronizedComputeFunction(() =>
      Effect.gen(function* () {
        throw new Error('Not implemented');
      }),
    ),
  }),
};
