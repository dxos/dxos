//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { describeInput, describeTypes } from '@dxos/assistant/Describe';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Order, Query, Ref, Relation, Type, URI } from '@dxos/echo';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { type HintSyntax, makeDescriber } from './describe.ts';
import {
  type BindingsContext,
  type Dialect,
  type InstructionsContext,
  NO_OPERATIONS,
  type SandboxOperation,
  printingConsole,
  renderOperation,
  renderTypes,
} from './Dialect.ts';
import { type DocEntry, STATIC_DOCS, loadDocs } from './docs/index.ts';

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
  database: true,

  operations: (operations) =>
    [renderOperationList(operations), renderEffectTools(operations)].filter((part) => part !== '').join('\n\n'),

  // `DOCS` is assembled ahead of the program so the model reads it as the plain object it is told it is.
  wrap: (code) =>
    `const DOCS = Object.freeze({ ...(await runEffect(loadDocs)), ...catalog });\n` +
    `return await runEffect(Effect.gen(function* () {\n${code}\n}));`,

  bindings: ({ runtime, operations, skills, print }: BindingsContext) => {
    const describe = makeDescriber({ syntax: EFFECT_HINTS, skills });
    return {
      // The namespaces the code is written against, exactly as a module would import them.
      Effect,
      Database: { ...Database, resolve: resolveWith(operations) },
      Filter,
      Query,
      Order,
      Obj,
      Relation,
      Ref,
      Type,
      DXN,
      Operation,
      // A tool with no operation behind it, such as an MCP server's, is called by its name instead.
      Tools: Object.fromEntries(
        operations.flatMap((operation) =>
          operation.definition ? [] : [[operation.name, (input: unknown = {}) => operation.invoke(input)]],
        ),
      ),

      // Described against the code's own database, so a printed object carries the relations, children
      // and referrers around it — what the model cannot see by reading its fields.
      print: (...values: unknown[]) =>
        Effect.forEach(values, describe).pipe(
          Effect.map((lines) => print(...lines)),
          Effect.provideContext(runtime),
        ),
      console: printingConsole(print),

      /** Supplied by `wrap`, not by the model: the static half of `DOCS`. */
      loadDocs,

      /** Supplied by `wrap`, not by the model: the half of `DOCS` listing what this turn can resolve. */
      catalog: renderCatalog({
        operations,
        types: describeTypes(Context.get(runtime, Database.Service).db),
      }),

      /** Supplied by `wrap`, not by the model: runs its program against the turn's services. */
      runEffect: RuntimeProvider.runPromise(Effect.succeed(runtime)),
    };
  },

  instructions: ({ operations, types }: InstructionsContext) => trim`
    ## Code mode

    You have exactly one tool, \`eval\`. Its \`code\` is the body of an \`Effect.gen\` generator run
    against this workspace, so \`yield*\` is available and you must NOT write the wrapper yourself.
    It returns whatever the code printed: a value you do not \`print\` never reaches you. Do not use
    \`import\` or \`require\` — the modules below are already in scope.

    Prefer one \`eval\` call that does the whole job — resolve, query, change, print — over a call
    per step. Each call is a fresh program: nothing defined in an earlier call exists in the next,
    so load again what you need. Print the specific values you need to reason about, not long lists of whole objects.
    Stay on the objects the request names or the conversation is attached to: reading or changing
    others the request did not ask about spends calls and risks unasked-for writes.

    ${EFFECT_API}

    ${renderTypes(types, ({ dxn }) => dxn)}

    ${operations.some((operation) => operation.definition) ? renderEffectOperations(operations) : NO_OPERATIONS}

    ${renderEffectTools(operations)}
  `,
};

/** The code a printed object's hints show, in this dialect: each fetches the group it counts. */
const EFFECT_HINTS: HintSyntax = {
  relations: (id, relation, direction) =>
    `yield* Database.query(Query.select(Filter.id('${id}')).${direction === 'out' ? 'sourceOf' : 'targetOf'}('${relation}')).run`,
  children: (id) => `yield* Database.query(Query.select(Filter.id('${id}')).children()).run`,
  referrers: (id, type, field) =>
    `yield* Database.query(Query.select(Filter.id('${id}')).referencedBy('${type}'${field === undefined ? '' : `, '${field}'`})).run`,
};

/** The `DOCS` entries generated per evaluation from what the turn can resolve. */
const CATALOG_DOCS: readonly DocEntry[] = [
  { name: 'catalog/types.md', covers: 'Every type this workspace can resolve: its DXN, kind and fields.' },
  { name: 'catalog/operations.md', covers: 'Every operation this turn can resolve: its DXN, description and input.' },
];

const DOC_ENTRIES: readonly DocEntry[] = [...STATIC_DOCS, ...CATALOG_DOCS];

/**
 * The dialect's API reference: what is in scope and how types and operations are reached. Exported for MCP's
 * `runScript`, which runs this dialect too, so a client is told about the same API the agent is.
 */
export const EFFECT_API = trim`
    ### In scope

    - \`Database\`, \`Filter\`, \`Query\`, \`Order\`, \`Obj\`, \`Relation\`, \`Ref\`, \`Type\`, \`DXN\`,
      \`Operation\`, \`Effect\` — the DXOS modules, as a source file would import them.
    - \`print(...values)\` — an effect: \`yield* print('count', tasks.length)\`. Strings go through
      verbatim. An object prints as a card: its type, id, label and fields, refs as \`→ type id "label"\`,
      then counts of its relations, children and referrers with the exact code that fetches each —
      the only way to see that those exist. Print the object itself, never \`JSON.stringify\` it.
      Anything else prints as JSON, long strings and arrays cut with a \`…[+N chars]\` / \`… N more\`
      marker.
    - \`DOCS\` — the full reference for this API: a plain object mapping file names to markdown
      strings. Read the file you need before writing anything this prompt does not show, a long one in
      slices (\`yield* print(DOCS['queries.md'].slice(0, 1000))\`); \`README.md\` shows how to grep
      them all. These are all of its entries:
    ${DOC_ENTRIES.map(({ name, covers }) => `  - \`${name}\` — ${covers}`).join('\n')}

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
    \`Ref.make(obj)\` of an object you hold — never an id or a URI string. An object you know only by
    its URI (\`echo://…\`, as an operation's output or your context names it) is
    \`yield* Database.resolve(uri)\`. A \`Ref\` field loads with \`yield* Database.load(task.owner)\`; its
    URI is \`ref.uri\`. An operation returns its listed \`output\`, with live objects in it. A failed load
    or operation fails the whole program; \`DOCS['errors.md']\` shows how to contain one.

    \`yield*\` works only directly in this body, not inside a callback such as \`.map((x) => …)\`: loop
    with \`for … of\`. This is Effect 4: \`Effect.catch\`, \`Effect.catchCause\` and \`Effect.result\`
    replace \`catchAll\`, \`catchAllCause\` and \`either\`.

    A skill may name tools for reading, querying or updating objects; in code those are hidden, so do
    that with \`Database\` and \`Obj\` instead.

    Do not guess at a helper this prompt or \`DOCS\` does not show: an unshown name fails as \`is not
    a function\` and costs a call.
`;

/**
 * The catalog files of `DOCS`, from the same renderers as the prompt. Built from the registry the
 * code runs against, so the list is what `Database.resolve` will actually answer there.
 */
const renderCatalog = ({
  operations,
  types,
}: {
  operations: readonly SandboxOperation[];
  types: ReturnType<typeof describeTypes>;
}): Record<string, string> => ({
  'catalog/types.md': trim`
    # Types

    Resolve one with \`yield* Database.resolve('<dxn>')\`. \`README.md\` shows how to list every key.
    These are the types registered here; a host may serve more on demand, which the Skill Manager's
    \`queryTypes\` finds.

    ${renderTypes(types, ({ dxn }) => dxn)}
  `,
  'catalog/operations.md': trim`
    # Operations

    Resolve one with \`yield* Database.resolve('<dxn>')\` and run it with
    \`yield* Operation.invoke(op, input)\`. \`README.md\` shows how to list every key.

    ${operations.some((operation) => operation.definition) ? renderOperationList(operations) : NO_OPERATIONS}
  `,
});

/** The key an operation is resolved and documented under: its own DXN, as `Operation.meta.key` holds it. */
const operationKey = (definition: Operation.Definition.Any): string => String(definition.meta.key);

/**
 * `Database.resolve`, answering the turn's bound operations itself: a definition is code that lives
 * with its handler rather than an entity the registry holds, so the registry cannot resolve one.
 * Every other DXN — a type, an object — goes to the real resolver.
 */
/**
 * An object's legacy ECHO DXN (`dxn:echo:<space>:<id>`, `@` or nothing for this space), or an object URI behind a
 * `dxn:` it does not take (`dxn:echo://…`), which models still write.
 */
const LEGACY_ECHO_DXN = /^dxn:echo:(?:([A-Z0-9]+|@):)?([0-9A-Z]{26})$/;

/** The object URI a legacy ECHO DXN names, since no resolver reads that form any more; any other string as is. */
export const fromLegacyEchoDXN = (ref: string): URI.URI => {
  if (ref.startsWith('dxn:echo://')) {
    return URI.make(ref.slice('dxn:'.length));
  }
  const match = LEGACY_ECHO_DXN.exec(ref);
  if (!match) {
    return URI.make(ref);
  }
  const [, space, id] = match;
  return URI.make(space === undefined || space === '@' ? `echo:///${id}` : `echo://${space}/${id}`);
};

const resolveWith = (operations: readonly SandboxOperation[]) => {
  // Keyed without the `dxn:` prefix: the Skill Manager reports an operation by its registry key, which may omit it.
  const definitions = new Map(
    operations.flatMap(({ definition }) =>
      definition ? [[bareKey(operationKey(definition)), definition] as const] : [],
    ),
  );
  return (ref: URI.URI | Ref.Ref<Obj.Unknown>, schema?: Type.AnyEntity) => {
    const definition = typeof ref === 'string' ? definitions.get(bareKey(ref)) : undefined;
    if (definition !== undefined) {
      return Effect.succeed(definition);
    }
    const target = typeof ref === 'string' ? fromLegacyEchoDXN(ref) : ref;
    const resolved = schema === undefined ? Database.resolve(target) : Database.resolve(target, schema);
    // A type a source serves on demand (on EDGE, the published types) reaches the registry only once it is asked for,
    // which `Database.resolve` does not do, and a type named without its version is not found by it at all; asked here
    // first, either resolves. A lookup that fails leaves `Database.resolve` to report what it finds.
    return typeof target === 'string' && DXN.isDXN(target)
      ? Effect.gen(function* () {
          const { db } = yield* Database.Service;
          const type = yield* Effect.tryPromise(() => resolveTypeOf(db, target)).pipe(
            Effect.orElseSucceed(() => undefined),
          );
          return type !== undefined && schema === undefined ? type : yield* resolved;
        })
      : resolved;
  };
};

/**
 * A type by its DXN, as the database's resolver finds one: in the registry, else from the type sources that serve
 * types on demand, which register what they return. A DXN without a version — operation inputs and printed objects
 * name types so — is the newest version registered. Undefined when none has it.
 */
export const resolveTypeOf = async (db: Database.Database, uri: URI.URI): Promise<unknown> => {
  const resolved = await db.graph.createRefResolver({ context: { space: db.spaceId } }).resolveType?.(uri);
  if (resolved !== undefined || !DXN.isDXN(uri) || DXN.getVersion(uri) !== undefined) {
    return resolved;
  }
  const typename = DXN.getName(uri);
  return db.registry
    .list()
    .filter((entity): entity is Type.AnyEntity => Type.isType(entity) && Type.getTypename(entity) === typename)
    .sort((left, right) => compareVersions(Type.getVersion(right), Type.getVersion(left)))[0];
};

const compareVersions = (left: string, right: string): number => {
  const [a, b] = [left, right].map((version) => version.split('.').map(Number));
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

const bareKey = (key: string): string => key.replace(/^dxn:/, '');

const renderEffectOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills' instructions describe their capabilities as tools; in code mode they are NOT tools. Resolve an
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

  ${renderOperationList(operations)}
`;

/** The tools no operation backs, which `Tools` binds by name; nothing when there are none. */
const renderEffectTools = (operations: readonly SandboxOperation[]): string => {
  const tools = operations.filter((operation) => !operation.definition);
  return tools.length === 0
    ? ''
    : trim`
      ### Tools

      The conversation's MCP servers add these. They are NOT tools here either: each is an effect on
      \`Tools\`, taking one argument matching its input schema, and a failed call fails the program.

      ${tools.map((tool) => renderOperation(tool, (name) => `yield* Tools[${JSON.stringify(name)}](input)`)).join('\n')}
    `;
};

/** One line per operation backed by a definition, naming the DXN it resolves by. */
const renderOperationList = (operations: readonly SandboxOperation[]): string =>
  operations
    .flatMap((operation) => {
      const { definition } = operation;
      return definition
        ? [
            renderOperation(
              operation,
              () => `yield* Database.resolve('${operationKey(definition)}')`,
              // A worker's stand-in definition carries no input schema; the operation's JSON schema does.
              definition.input.ast._tag === 'Unknown' ? undefined : describeInput(definition.input),
              // What `Operation.invoke` returns, so the code reads the field that holds the result.
              definition.output.ast._tag === 'Unknown' ? undefined : describeInput(definition.output),
            ),
          ]
        : [];
    })
    .join('\n');
