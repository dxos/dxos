//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { RuntimeProvider } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import {
  type BindingsContext,
  type Dialect,
  type InstructionsContext,
  NO_OPERATIONS,
  type SandboxOperation,
  renderOperation,
  renderTypes,
} from './Dialect.ts';

/**
 * A typename the registry has no object type for — an expected failure of the model's code, so it
 * belongs in the effect's error channel rather than being a defect. `RuntimeProvider.runPromise`
 * surfaces it to the sandbox as a rejected promise either way.
 */
export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectTypeError>('UnknownObjectTypeError')(
  'UnknownObjectTypeError',
  {
    typename: Schema.String,
    message: Schema.String,
  },
) {}

/**
 * Plain async JavaScript over a small facade: `await query(...)`, `update(obj, mutator)`,
 * `await ops.thing(input)`.
 *
 * Every binding is a function taking and returning plain data, so this dialect is the one that
 * survives an out-of-process `Sandbox` — the facade is exactly the RPC surface such a sandbox would
 * expose. It is also the smaller thing to learn, at the cost of not being the API the rest of the
 * codebase is written in.
 */
export const PlainDialect: Dialect = {
  name: 'plain',

  wrap: (code) => code,

  bindings: ({ runtime, operations, print }: BindingsContext) => {
    const run = RuntimeProvider.runPromise(Effect.succeed(runtime));
    return {
      print,

      /** Objects of `typename`, optionally narrowed by exact property values. */
      query: (typename: string, props?: Record<string, unknown>) =>
        run(Database.query(Filter.type(DXN.make(typename), props)).run),

      /** Creates an unpersisted object of `typename`; pass it to `add` to store it. */
      make: (typename: string, props: Record<string, unknown>) =>
        run(
          Effect.gen(function* () {
            const { db } = yield* Database.Service;
            // Matched on the typename rather than by URI: a registered type is indexed under its
            // VERSIONED DXN, and the model names a type the same way it does in a query —
            // unversioned. Objects only: a relation needs a source and target `make` cannot take.
            const type = db.registry
              .list()
              .find((entity) => Type.isType(entity) && Type.getTypename(entity) === typename);
            if (type === undefined || !Type.isType(type) || !Type.isObject(type)) {
              return yield* Effect.fail(
                new UnknownObjectTypeError({ typename, message: `Unknown object type: ${typename}` }),
              );
            }
            return Obj.make(type, props);
          }),
        ),

      /** A reference to `obj`, which is what a `Ref<typename>` field holds. */
      ref: (obj: Obj.Unknown) => Ref.make(obj),
      add: (obj: Obj.Unknown) => run(Database.add(obj)),
      remove: (obj: Obj.Unknown) => run(Database.remove(obj)),
      flush: () => run(Database.flush()),
      update: (obj: Obj.Unknown, mutator: (obj: any) => void) => Obj.update(obj, mutator),

      ops: Object.fromEntries(
        operations.flatMap((operation) => {
          const invoke = (input: unknown = {}) => run(operation.invoke(input));
          // Bound under the tool name and its camelCase form: the derived names are kebab-case,
          // which is not an identifier, so `ops.researchOrg` would otherwise have to be bracketed.
          return [
            [operation.name, invoke],
            [camelCase(operation.name), invoke],
          ];
        }),
      ),
    };
  },

  instructions: ({ operations, types }: InstructionsContext) => trim`
    ## Code mode

    You have exactly one tool, \`eval\`, which runs the body of an async JavaScript function against
    this workspace and returns whatever that code printed. Nothing else is visible to you: a value
    you do not \`print\` never reaches you. Do not use \`import\` or \`require\` — the API below is
    in scope.

    Prefer one \`eval\` call that does the whole job — query, inspect, change, print — over a call
    per step. Print the specific values you need to reason about, not whole objects, and keep the
    output small.

    ### API

    - \`print(...values)\` — adds a line to this call's output. Strings go through verbatim,
      everything else is printed as JSON.
    - \`await query(typename, props?)\` — objects of that typename, optionally narrowed by exact
      property values, e.g. \`await query('example.com/type/Task', { status: 'open' })\`.
    - \`await make(typename, props)\` — a new object; it is not stored until you add it.
    - \`await add(obj)\` / \`await remove(obj)\` — store or delete an object.
    - \`update(obj, (obj) => { obj.field = value; })\` — the only way to change a stored object.
    - \`await flush()\` — waits for pending writes to land; call it before printing a final
      confirmation.
    - \`ref(obj)\` — a reference to an object you hold. A \`Ref<typename>\` field takes one, never
      an id or a URI string: \`await make('example.com/type/Task', { title: 'Review', owner: ref(person) })\`.
      Where an operation's input takes references, pass \`ref(obj)\` too.

    ${renderTypes(types)}

    ${operations.length > 0 ? renderPlainOperations(operations) : NO_OPERATIONS}
  `,
};

const renderPlainOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills above describe their capabilities as tools; in code mode they are NOT tools. Each one
  is an async function on \`ops\`, taking one argument matching its parameter schema. A failed
  operation throws, so wrap a call you expect to fail in \`try\`/\`catch\`. The names are kebab-case,
  so they are indexed rather than dotted.

  ${operations
    .map((operation) => renderOperation(operation, (name) => `await ops[${JSON.stringify(name)}](input)`))
    .join('\n')}
`;

const camelCase = (name: string): string => name.replace(/[-_]([a-z0-9])/g, (_, char: string) => char.toUpperCase());
