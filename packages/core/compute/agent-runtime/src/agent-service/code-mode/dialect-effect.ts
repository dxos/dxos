//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { RuntimeProvider } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { type BindingsContext, type Dialect, NO_OPERATIONS, type Operation, renderOperation } from './Dialect.ts';

/**
 * The repo's own ECHO API, written as an Effect program: `yield* Database.query(Filter.type(...)).run`.
 *
 * The bet is that a model writes better code against the API the codebase already documents and
 * that its training has seen than against a facade invented for it — and that whatever it writes
 * transfers to code a human would commit. The cost is that `Effect.gen`/`yield*` is a lot of
 * ceremony for "list the open tasks", and that live objects and module namespaces in scope pin this
 * dialect to an in-process `Sandbox` (see the note there).
 *
 * The model's code is the body of an `Effect.gen`, so `yield*` is available without it having to
 * remember the wrapper.
 */
export const EffectDialect: Dialect = {
  name: 'effect',

  wrap: (code) => `return await runEffect(Effect.gen(function* () {\n${code}\n}));`,

  bindings: ({ runtime, operations, print }: BindingsContext) => ({
    // The namespaces the code is written against, exactly as a module would import them.
    Effect,
    Database,
    Filter,
    Query,
    Obj,
    Ref,
    Type,
    DXN,

    /** Every registered object type, keyed by typename — what `Obj.make` and `Filter.type` take. */
    types: Object.fromEntries(
      Context.get(runtime, Database.Service)
        .db.registry.list()
        .filter((entity) => Type.isType(entity) && Type.isObject(entity))
        .map((type) => [Type.getTypename(type), type]),
    ),

    print: (...values: unknown[]) => Effect.sync(() => print(...values)),

    ops: Object.fromEntries(operations.map((operation) => [operation.name, operation.invoke])),

    /** Supplied by `wrap`, not by the model: runs its program against the turn's services. */
    runEffect: RuntimeProvider.runPromise(Effect.succeed(runtime)),
  }),

  instructions: (operations: readonly Operation[]) => trim`
    ## Code mode

    You have exactly one tool, \`eval\`. Its \`code\` is the body of an \`Effect.gen\` generator run
    against this workspace, so \`yield*\` is available and you must NOT write the wrapper yourself.
    It returns whatever the code printed: a value you do not \`print\` never reaches you. Do not use
    \`import\` or \`require\` — the modules below are already in scope.

    Prefer one \`eval\` call that does the whole job — query, inspect, change, print — over a call
    per step. Print the specific values you need to reason about, not whole objects.

    ### In scope

    - \`Database\`, \`Filter\`, \`Query\`, \`Obj\`, \`Ref\`, \`Type\`, \`DXN\`, \`Effect\` — the DXOS
      ECHO modules, as a source file would import them.
    - \`types\` — every registered object type, keyed by typename:
      \`types['example.com/type/Task']\`.
    - \`print(...values)\` — an effect: \`yield* print('count', tasks.length)\`. Strings go through
      verbatim, everything else is printed as JSON.

    ### Reading and writing

    \`\`\`js
    const tasks = yield* Database.query(Filter.type(types['example.com/type/Task'], { status: 'open' })).run;
    yield* print('open', tasks.length);

    Obj.update(tasks[0], (task) => { task.status = 'done'; });

    const created = yield* Database.add(Obj.make(types['example.com/type/Task'], { title: 'New', status: 'open' }));
    yield* Database.flush();
    yield* print('created', created.id);
    \`\`\`

    \`Obj.update\` is synchronous and is the only way to change a stored object. \`Database.remove\`
    deletes one. Call \`Database.flush()\` before printing a final confirmation.

    ${operations.length > 0 ? renderEffectOperations(operations) : NO_OPERATIONS}
  `,
};

const renderEffectOperations = (operations: readonly Operation[]): string => trim`
  ### Operations

  The skills above describe their capabilities as tools; in code mode they are NOT tools. Each one
  is an effect on \`ops\`, taking one argument matching its parameter schema:
  \`const result = yield* ops['tool-name']({ ... })\`. A failed operation fails the effect, so wrap
  a call you expect to fail in \`Effect.result\`.

  ${operations.map((operation) => renderOperation(operation, (name) => `yield* ops['${name}'](input)`)).join('\n')}
`;
