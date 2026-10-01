//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Type, type URI } from '@dxos/echo';
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
import { loadDocs } from './docs/index.ts';
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
 * remember the wrapper. Types and operations are both reached by DXN through `Database.resolve`, and
 * the detailed reference lives in `DOCS` for the model to read on demand rather than in the prompt.
 */
export const EffectDialect: Dialect = {
  name: 'effect',

  // `DOCS` is loaded ahead of the program so the model reads it as the plain object it is told it is.
  wrap: (code) =>
    `const DOCS = await runEffect(loadDocs);\nreturn await runEffect(Effect.gen(function* () {\n${code}\n}));`,

  bindings: ({ runtime, operations, print }: BindingsContext) => ({
    // The namespaces the code is written against, exactly as a module would import them.
    Effect,
    Database: { ...Database, resolve: resolveWith(operations) },
    Filter,
    Query,
    Obj,
    Ref,
    Type,
    DXN,
    Operation,

    print: (...values: unknown[]) => Effect.sync(() => print(...values)),

    /** Supplied by `wrap`, not by the model: binds `DOCS` before the program runs. */
    loadDocs,

    /** Supplied by `wrap`, not by the model: runs its program against the turn's services. */
    runEffect: RuntimeProvider.runPromise(Effect.succeed(runtime)),
  }),

  instructions: ({ operations, types }: InstructionsContext) => trim`
    ## Code mode

    You have exactly one tool, \`eval\`. Its \`code\` is the body of an \`Effect.gen\` generator run
    against this workspace, so \`yield*\` is available and you must NOT write the wrapper yourself.
    It returns whatever the code printed: a value you do not \`print\` never reaches you. Do not use
    \`import\` or \`require\` — the modules below are already in scope.

    Prefer one \`eval\` call that does the whole job — resolve, query, change, print — over a call
    per step. Print the specific values you need to reason about, not whole objects.

    ### In scope

    - \`Database\`, \`Filter\`, \`Query\`, \`Obj\`, \`Ref\`, \`Type\`, \`DXN\`, \`Operation\`, \`Effect\` —
      the DXOS modules, as a source file would import them.
    - \`print(...values)\` — an effect: \`yield* print('count', tasks.length)\`. Strings go through
      verbatim, everything else is printed as JSON.
    - \`DOCS\` — the full reference for this API: a plain object mapping file names to markdown
      strings. Explore it yourself before writing anything this prompt does not show — start with
      \`yield* print(Object.keys(DOCS))\` and \`yield* print(DOCS['README.md'])\`, and read a long
      file in slices: \`yield* print(DOCS['database.md'].slice(0, 1000))\`.

    ### Types and operations are resolved by DXN

    \`\`\`js
    const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
    const tasks = yield* Database.query(Filter.type(Task, { status: 'open' })).run;
    Obj.update(tasks[0], (task) => { task.status = 'done'; });
    const created = yield* Database.add(Obj.make(Task, { title: 'New', status: 'open' }));
    yield* Database.flush();
    yield* print('created', created.id);
    \`\`\`

    \`Obj.update\` is the only way to change a stored object. A \`Ref<typename>\` field takes
    \`Ref.make(obj)\` of an object you hold — never an id or a URI string. A failed load or operation
    fails the whole program; \`DOCS['errors.md']\` shows how to contain one.

    Do not guess at a helper this prompt or \`DOCS\` does not show: an unshown name fails as \`is not
    a function\` and costs a call.

    ${renderTypes(types, ({ dxn }) => dxn)}

    ${operations.some((operation) => operation.definition) ? renderEffectOperations(operations) : NO_OPERATIONS}
  `,
};

/** The key an operation is resolved and documented under: its own DXN, as `Operation.meta.key` holds it. */
const operationKey = (definition: Operation.Definition.Any): string => String(definition.meta.key);

/**
 * `Database.resolve`, answering the turn's bound operations itself: a definition is code that lives
 * with its handler rather than an entity the registry holds, so the registry cannot resolve one.
 * Every other DXN — a type, an object — goes to the real resolver.
 */
const resolveWith = (operations: readonly SandboxOperation[]) => {
  const definitions = new Map(
    operations.flatMap(({ definition }) => (definition ? [[operationKey(definition), definition] as const] : [])),
  );
  return (ref: URI.URI | Ref.Ref<Obj.Unknown>, schema?: Type.AnyEntity) => {
    const definition = typeof ref === 'string' ? definitions.get(ref) : undefined;
    if (definition !== undefined) {
      return Effect.succeed(definition);
    }
    return schema === undefined ? Database.resolve(ref) : Database.resolve(ref, schema);
  };
};

const renderEffectOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills above describe their capabilities as tools; in code mode they are NOT tools. Resolve an
  operation by its DXN and invoke it the way any other DXOS code does (\`DOCS['operations.md']\` has
  the details):

  \`\`\`js
  const Example = yield* Database.resolve('dxn:com.example.operation.example');
  const result = yield* Operation.invoke(Example, { ...input });
  \`\`\`

  Each \`input\` below is the operation's own schema: pass objects you hold (or \`Ref.make(obj)\`)
  where it takes an object or a \`Ref<typename>\`, never an id or a URI string. A skill that spells a
  reference as a \`{"/": "echo:..."}\` envelope or a URI string is describing the tool form; this
  reference wins. Most of what an operation does to one object is a line of \`Obj\`/\`Database\`
  code; prefer that.

  ${operations
    .flatMap((operation) => {
      const { definition } = operation;
      return definition
        ? [
            renderOperation(
              operation,
              () => `yield* Database.resolve('${operationKey(definition)}')`,
              describeInput(definition.input),
            ),
          ]
        : [];
    })
    .join('\n')}
`;
