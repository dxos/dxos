//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
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
import { describeInput } from './fields.ts';

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
    Operation,

    /** Every registered object type, keyed by typename — what `Obj.make` and `Filter.type` take. */
    types: Object.fromEntries(
      Context.get(runtime, Database.Service)
        .db.registry.list()
        .filter((entity) => Type.isType(entity) && Type.isObject(entity))
        .map((type) => [Type.getTypename(type), type]),
    ),

    print: (...values: unknown[]) => Effect.sync(() => print(...values)),

    // The operations themselves, not wrappers: the model invokes one the way a source file does,
    // `yield* Operation.invoke(ops['<dxn>'], input)`. Keyed by DXN rather than by the tool name the
    // other dialect uses — that name is derived from the key lossily (kebab-cased, dots to dashes)
    // and is a model-facing identifier, not something this repo's code ever refers to an operation
    // by. A tool with no definition behind it (provider-defined, MCP) has nothing to bind here, and
    // is left out of the reference too.
    ops: Object.fromEntries(
      operations.flatMap((operation) =>
        operation.definition ? [[operationKey(operation.definition), operation.definition]] : [],
      ),
    ),

    /** Supplied by `wrap`, not by the model: runs its program against the turn's services. */
    runEffect: RuntimeProvider.runPromise(Effect.succeed(runtime)),
  }),

  instructions: ({ operations, types }: InstructionsContext) => trim`
    ## Code mode

    You have exactly one tool, \`eval\`. Its \`code\` is the body of an \`Effect.gen\` generator run
    against this workspace, so \`yield*\` is available and you must NOT write the wrapper yourself.
    It returns whatever the code printed: a value you do not \`print\` never reaches you. Do not use
    \`import\` or \`require\` — the modules below are already in scope.

    Prefer one \`eval\` call that does the whole job — query, inspect, change, print — over a call
    per step. Print the specific values you need to reason about, not whole objects.

    ### In scope

    - \`Database\`, \`Filter\`, \`Query\`, \`Obj\`, \`Ref\`, \`Type\`, \`DXN\`, \`Operation\`, \`Effect\` —
      the DXOS modules, as a source file would import them.
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

    ### References

    A \`Ref<typename>\` field takes \`Ref.make(obj)\` of an object you hold — never an id or a URI
    string. Create the target first, then the object that points at it:

    \`\`\`js
    const owner = yield* Database.add(Obj.make(types['example.com/type/Person'], { name: 'Ada' }));
    yield* Database.add(Obj.make(types['example.com/type/Task'], { title: 'Review', status: 'open', owner: Ref.make(owner) }));
    \`\`\`

    Read a reference back with \`yield* Database.load(task.owner)\`. To fetch an object whose id you
    hold, query for it: \`const [task] = yield* Database.query(Filter.id(id)).run;\`.

    A ref array can point at objects that were deleted, and one failed load fails the whole
    program, so load such arrays one ref at a time through \`Effect.result\`. Its value is
    \`{ _tag: 'Success', success }\` or \`{ _tag: 'Failure', failure }\` — there is no \`value\`:

    \`\`\`js
    for (const ref of taskSet.tasks) {
      const loaded = yield* Effect.result(Database.load(ref));
      if (loaded._tag === 'Failure') { yield* print('missing', ref.uri); continue; }
      yield* print(loaded.success.title);
    }
    \`\`\`

    Do not guess at a helper this reference does not show: an unshown name fails as \`is not a
    function\` and costs a call.

    ${renderTypes(types)}

    ${operations.some((operation) => operation.definition) ? renderEffectOperations(operations) : NO_OPERATIONS}
  `,
};

/** The key an operation is bound and documented under: its own DXN, as `Operation.meta.key` holds it. */
const operationKey = (definition: Operation.Definition.Any): string => String(definition.meta.key);

const renderEffectOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills above describe their capabilities as tools; in code mode they are NOT tools. \`ops\`
  holds the operation definitions themselves, which you invoke the way any other DXOS code does:

  \`\`\`js
  const result = yield* Operation.invoke(ops['dxn:com.example.operation.example'], { ...input });
  \`\`\`

  A failed operation fails the effect, so wrap a call you expect to fail in \`Effect.result\` (shape
  above).
  Each \`input\` below is the operation's own schema. Where it takes an object or a \`Ref<typename>\`,
  pass the object you hold (or \`Ref.make(obj)\`) — never an id or a URI string; fetch the object
  first if all you hold is its id. A skill that spells a reference as a \`{"/": "echo:..."}\` envelope
  or a URI string is describing the tool form; this reference wins. Most of what an operation does
  to one object is a line of \`Obj\`/\`Database\` code; prefer that.

  ${operations
    .flatMap((operation) => {
      const { definition } = operation;
      return definition
        ? [
            renderOperation(
              operation,
              () => `yield* Operation.invoke(ops['${operationKey(definition)}'], input)`,
              describeInput(definition.input),
            ),
          ]
        : [];
    })
    .join('\n')}
`;
