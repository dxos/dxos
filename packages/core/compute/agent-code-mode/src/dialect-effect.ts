//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
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
  type LookupOperation,
  NO_OPERATIONS,
  type SandboxOperation,
  printingConsole,
  renderOperation,
  renderTypes,
} from './Dialect.ts';
import { type DocEntry, STATIC_DOCS, loadDocs } from './docs/index.ts';
import { toObjectURI } from './refs.ts';

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
  skillInstructions: (key) => `DOCS[${JSON.stringify(skillDocName(key))}]`,

  // Named only: the model reads an operation's input in `DOCS['catalog/operations.md']`, which each evaluation rebuilds.
  operations: (operations) =>
    [renderOperationNames(operations), renderEffectTools(operations)].filter((part) => part !== '').join('\n\n'),

  // `DOCS` is assembled ahead of the program so the model reads it as the plain object it is told it is.
  wrap: (code) =>
    `const DOCS = Object.freeze({ ...(await runEffect(loadDocs)), ...catalog });\n` +
    `const search = (query) => searchAll(DOCS, query);\n` +
    `return await runEffect(Effect.gen(function* () {\n${code}\n}));`,

  bindings: ({ runtime, operations, skills, skillDocs, lookupOperation, print }: BindingsContext) => {
    const describe = makeDescriber({ syntax: EFFECT_HINTS, skills });
    // A print built without `yield*` runs when the program ends: told nothing printed, a model runs it all again.
    const unyielded = new Set<Effect.Effect<void>>();
    const printEffect = (...values: unknown[]): Effect.Effect<void> => {
      const effect: Effect.Effect<void> = Effect.suspend(() => {
        unyielded.delete(effect);
        return Effect.forEach(values, describe).pipe(
          Effect.map((lines) => print(...lines)),
          Effect.provideContext(runtime),
        );
      });
      unyielded.add(effect);
      return effect;
    };
    const run = RuntimeProvider.runPromise(Effect.succeed(runtime));
    return {
      // The namespaces the code is written against, exactly as a module would import them.
      Effect,
      Database: { ...Database, resolve: resolveWith(operations, lookupOperation), load },
      // A type named by its typename alone (`'org.dxos.type.document'`), as printed objects name it, filters as its DXN.
      Filter: {
        ...Filter,
        type: (input: Parameters<typeof Filter.type>[0], props?: Parameters<typeof Filter.type>[1]) =>
          Filter.type(typeof input === 'string' && !input.includes(':') ? URI.make(`dxn:${input}`) : input, props),
      },
      Query,
      Order,
      Obj,
      Relation,
      // Operations return references, and code wraps what it is handed: a reference made of one is that reference.
      Ref: {
        ...Ref,
        make: (target: Ref.Ref<Obj.Unknown> | Parameters<typeof Ref.make>[0]) =>
          Ref.isRef(target) ? target : Ref.make(target),
      },
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
      print: printEffect,
      console: printingConsole(print),

      /** Supplied by `wrap`, not by the model: the static half of `DOCS`. */
      loadDocs,

      /** Supplied by `wrap`, not by the model: what `search` runs, over `DOCS` and the registries. */
      searchAll,

      /** Supplied by `wrap`, not by the model: the half of `DOCS` listing what this turn can resolve. */
      catalog: renderCatalog({
        operations,
        types: describeTypes(Context.get(runtime, Database.Service).db.registry.list()),
        skillDocs,
      }),

      /** Supplied by `wrap`, not by the model: runs its program against the turn's services. */
      runEffect: <A, E>(effect: Effect.Effect<A, E>) =>
        run(effect.pipe(Effect.ensuring(Effect.suspend(() => Effect.forEach([...unyielded], (left) => left))))),
    };
  },

  instructions: ({ operations, types }: InstructionsContext) => trim`
    ## Code mode

    Your one tool, \`eval\`, runs its \`code\` as the body of an \`Effect.gen\` generator against this
    workspace: \`yield*\` each Effect (\`await\` does not compile), and write no wrapper, \`import\` or
    \`require\`. Only what you \`print\` comes back. Each call is a fresh program, so do the whole job —
    resolve, query, change, print — in as few calls as you can. Print the values you need, not whole lists,
    and stay on the objects the request names.

    ${EFFECT_API}

    ${renderTypes(types, ({ dxn }) => dxn, `\`${QUERY_TYPES}\` (\`{ query }\`, words in the type or field names)`)}

    ${operations.some((operation) => operation.definition) ? EFFECT_OPERATIONS : NO_OPERATIONS}

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

/** The `DOCS` file holding one enabled skill's instructions. */
const skillDocName = (key: string): string => `skills/${key.replace(/^dxn:/, '')}.md`;

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
      \`Operation\`, \`Effect\` — the DXOS modules.
    - \`yield* print(...values)\` — strings verbatim, an object as a card (its fields, refs, and the code
      that fetches its relations, children and referrers), anything else as JSON. Print the object
      itself, not \`JSON.stringify\` of it.
    - \`search(words)\` — an effect: the passages of \`DOCS\` that mention those words (operations with
      their DXN and input, types with their fields, skill instructions, the reference), and the skills,
      operations and types registered beyond them. Start here: \`yield* print(yield* search('task artifact'))\`.
    - \`DOCS\` — the reference, a plain object of markdown files. Read what you need, a long file in slices
      (\`yield* print(DOCS['queries.md'].slice(0, 1000))\`):
    ${DOC_ENTRIES.map(({ name, covers }) => `  - \`${name}\` — ${covers}`).join('\n')}

    ### Example

    \`\`\`js
    const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
    const tasks = yield* Database.query(Filter.type(Task, { status: 'open' })).run;
    Obj.update(tasks[0], (task) => { task.status = 'done'; });
    yield* Database.add(Obj.make(Task, { title: 'New', status: 'open' }));
    yield* Database.flush();
    \`\`\`

    - \`Filter.type(T, props?)\` takes a type you resolved, never a typename string.
    - Change a stored object only with \`Obj.update\`. A \`Ref<typename>\` field takes \`Ref.make(obj)\`,
      never an id or a URI string; \`yield* Database.load(ref)\` loads one. An object's id is \`obj.id\`, its
      URI \`Obj.getURI(obj)\`, and an object known by its URI (\`echo://…\`) is \`yield* Database.resolve(uri)\`.
    - A failed load or operation fails the program; \`DOCS['errors.md']\` shows how to contain one.
    - \`yield*\` works only directly in the body, not in a callback: loop with \`for … of\`. This is
      Effect 4: \`Effect.catch\`, \`Effect.catchCause\`, \`Effect.result\` (not \`catchAll\`, \`either\`).
    - Read, query and update objects with \`Database\` and \`Obj\`, not a skill's tools. Do not guess
      at a helper this prompt or \`DOCS\` does not show: it fails as \`is not a function\`.
`;

/**
 * The catalog files of `DOCS`, from the same renderers as the prompt. Built from the registry the
 * code runs against, so the list is what `Database.resolve` will actually answer there.
 */
export const renderCatalog = ({
  operations,
  types,
  skillDocs = {},
}: {
  operations: readonly SandboxOperation[];
  types: ReturnType<typeof describeTypes>;
  skillDocs?: Readonly<Record<string, string>>;
}): Record<string, string> => ({
  ...Object.fromEntries(Object.entries(skillDocs).map(([key, text]) => [skillDocName(key), text])),
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
 * Every other DXN — a type, an object — goes to the real resolver; a key it cannot answer may be an operation bound
 * since the evaluation began (a skill the program just enabled), which `lookupOperation` finds.
 */
const resolveWith = (operations: readonly SandboxOperation[], lookupOperation?: LookupOperation) => {
  // Keyed without the `dxn:` prefix: the Skill Manager reports an operation by its registry key, which may omit it.
  const definitions = new Map(
    operations.flatMap(({ definition }) =>
      definition ? [[bareKey(operationKey(definition)), definition] as const] : [],
    ),
  );
  return (ref: URI.URI | Ref.Ref<Obj.Unknown>, schema?: Type.AnyEntity) => {
    if (typeof ref !== 'string' && !Ref.isRef(ref)) {
      return Effect.fail(
        new ArgumentError({
          message: `\`Database.resolve\` takes a DXN or URI string, or a Ref; this is ${describeKind(ref)}.`,
        }),
      );
    }
    const definition = typeof ref === 'string' ? definitions.get(bareKey(ref)) : undefined;
    if (definition !== undefined) {
      return Effect.succeed(definition);
    }
    const target = typeof ref === 'string' ? URI.make(toObjectURI(ref) ?? ref) : ref;
    const resolved = schema === undefined ? Database.resolve(target) : Database.resolve(target, schema);
    // Asked only once the real resolver fails, since every type the program resolves would otherwise rebuild the
    // conversation's operations first.
    const lateBound = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      typeof ref !== 'string' || lookupOperation === undefined || schema !== undefined
        ? effect
        : effect.pipe(
            Effect.catchCause((cause) =>
              lookupOperation(ref).pipe(
                Effect.flatMap((definition) =>
                  definition === undefined ? Effect.failCause(cause) : Effect.succeed(definition),
                ),
              ),
            ),
          );
    // `Database.resolve` neither asks the type sources (EDGE's published types) nor finds a versionless type DXN.
    return lateBound(
      typeof target === 'string' && DXN.isDXN(target)
        ? Effect.gen(function* () {
            const { db } = yield* Database.Service;
            const type = yield* Effect.tryPromise(() => resolveTypeOf(db, target)).pipe(
              Effect.orElseSucceed(() => undefined),
            );
            return type !== undefined && schema === undefined ? type : yield* resolved;
          })
        : resolved,
    );
  };
};

/**
 * A type by its DXN, from the registry or the type sources; a DXN without a version (as operation inputs and printed
 * objects name types) is the newest version registered.
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
    .sort((left, right) =>
      Type.getVersion(right).localeCompare(Type.getVersion(left), undefined, { numeric: true }),
    )[0];
};

const bareKey = (key: string): string => key.replace(/^dxn:/, '');

/** `Database.load`, which also takes an object, since operation outputs hold objects and code loads what it gets. */
const load = <T>(ref: Ref.Ref<T> | T, options?: Parameters<typeof Database.load>[1]) =>
  Ref.isRef(ref)
    ? Database.load(ref, options)
    : Obj.isObject(ref)
      ? Effect.succeed(ref)
      : Effect.fail(
          new ArgumentError({
            message: `\`Database.load\` takes a Ref, such as a \`Ref<…>\` field; this is ${describeKind(ref)}.`,
          }),
        );

/** A value code passed that a binding cannot take: the model's mistake, reported as one rather than as a defect. */
class ArgumentError extends Schema.TaggedError<ArgumentError>('ArgumentError')('ArgumentError', {
  message: Schema.String,
}) {}

const describeKind = (value: unknown): string =>
  value === null || value === undefined ? String(value) : `a ${typeof value}`;

/**
 * How the model finds the operations, in place of listing them: a skill's operations, with their inputs, run to
 * thousands of tokens that most turns never read, and `DOCS['catalog/operations.md']` holds the same list on demand.
 */
/** The Skill Manager's lookups by DXN: the model guesses one it is told only by tool name. */
const QUERY_TYPES = String(SkillManagerSkill.Operations.QueryTypes.meta.key);
const ENABLE_SKILLS = String(SkillManagerSkill.Operations.EnableSkills.meta.key);

const EFFECT_OPERATIONS = trim`
  ### Operations

  Skills describe their capabilities as tools; here they are operations, not listed in this prompt.
  Find one with \`yield* search(words)\`: an operation this conversation can run comes with its DXN, the
  skills' tool name, input and output; one of a skill not enabled yet comes with that skill, which the
  Skill Manager's \`${ENABLE_SKILLS}\` (\`{ keys }\`) enables. Then run it: \`yield* Operation.invoke(yield* Database.resolve('<dxn>'), input)\`. Pass an object or
  \`Ref.make(obj)\` where the input takes one, never an id or a URI string. In an output, a typename is
  that object and a \`Ref<typename>\` a reference. Prefer plain \`Obj\`/\`Database\` code when it does
  the job.
`;

/** Operations by tool name and DXN, for a notice that more became available: their inputs are in the catalog. */
const renderOperationNames = (operations: readonly SandboxOperation[]): string =>
  operations
    .flatMap(({ name, definition }) => (definition ? [`- \`${name}\` — \`${operationKey(definition)}\``] : []))
    .join('\n') +
  (operations.some(({ definition }) => definition) ? "\n\nTheir inputs are in `DOCS['catalog/operations.md']`." : '');

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
              // The skills' instructions name an operation by its tool name.
              operation.name,
            ),
          ]
        : [];
    })
    .join('\n');

/** Passages a search returns at most, and the characters of each. */
const SEARCH_LIMIT = 8;
const PASSAGE_LENGTH = 1_200;

/**
 * The `DOCS` passages that mention the most of `query`'s words, best first, each headed by its file. A passage is a
 * section (up to the next heading) or, in a catalog, one entry, so a hit carries the DXN and input beside it.
 */
export const searchDocs = (docs: Readonly<Record<string, string>>, query: string): string => {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}.]+/u)
    .filter((word) => word.length > 1);
  if (words.length === 0) {
    return "Search for some words, e.g. `search('task artifact')`.";
  }
  const passages = Object.entries(docs).flatMap(([file, text]) =>
    text
      .split(/\n(?=#{1,4} |- `)/)
      .map((passage) => ({ file, passage: passage.trim() }))
      .filter(({ passage }) => passage.length > 0),
  );
  const ranked = passages
    .map((entry) => {
      const lower = entry.passage.toLowerCase();
      return { ...entry, score: words.filter((word) => lower.includes(word)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_LIMIT);
  return ranked.length === 0
    ? `Nothing in DOCS mentions ${JSON.stringify(query)}; try other words.`
    : ranked
        .map(
          ({ file, passage }) =>
            `[${file}]\n${passage.length > PASSAGE_LENGTH ? `${passage.slice(0, PASSAGE_LENGTH)}…[+${passage.length - PASSAGE_LENGTH} chars]` : passage}`,
        )
        .join('\n\n');
};

/**
 * What `search` runs: the loaded `DOCS`, and the Skill Manager's lookups, which ask the skill, operation and type
 * registries rather than assume everything is loaded here. A lookup that is not bound, or fails, adds nothing; each
 * answer leaves out what the docs already showed.
 */
export const searchAll = (
  docs: Readonly<Record<string, string>>,
  query: string,
): Effect.Effect<string, never, Operation.Service> =>
  Effect.gen(function* () {
    const local = searchDocs(docs, query);
    const lookup = <I, O>(operation: Operation.Definition<I, O>, input: I) =>
      Operation.invoke(operation, input).pipe(
        Effect.map((output): O | undefined => output),
        Effect.catchCause(() => Effect.succeed(undefined)),
      );
    const { Operations } = SkillManagerSkill;
    const [skills, operations, types] = yield* Effect.all(
      [
        lookup(Operations.QuerySkills, { query }),
        lookup(Operations.QueryOperations, { query }),
        lookup(Operations.QueryTypes, { query }),
      ],
      { concurrency: 'unbounded' },
    );
    const shown = (key: string) => local.includes(key);
    const sections = [
      section(
        'Skills',
        (skills ?? []).map(
          (skill) =>
            `- \`${skill.key}\` — ${skill.name}${skill.description ? `: ${skill.description}` : ''} ` +
            `(${skill.enabled ? 'enabled' : skill.agentCanEnable ? 'not enabled; you may enable it' : 'not enabled'})`,
        ),
      ),
      section(
        'Operations',
        (operations ?? [])
          .filter((operation) => !shown(operation.key))
          .map(
            (operation) =>
              `- \`${operation.key}\` (\`${operation.tool}\`) — ${operation.description ?? operation.name ?? ''} ` +
              `[skill \`${operation.skill}\`${operation.enabled ? '' : ', not enabled'}]`,
          ),
      ),
      section(
        'Types',
        (types ?? []).filter((type) => !shown(type.dxn)).map((type) => `- \`${type.dxn}\` (${type.kind})`),
      ),
    ].filter((text) => text !== undefined);
    return [local, ...sections].join('\n\n');
  });

/** A titled list of registry hits, or nothing when there are none. */
const section = (title: string, lines: readonly string[]): string | undefined =>
  lines.length === 0 ? undefined : [`[registry: ${title.toLowerCase()}]`, ...lines.slice(0, SEARCH_LIMIT)].join('\n');
