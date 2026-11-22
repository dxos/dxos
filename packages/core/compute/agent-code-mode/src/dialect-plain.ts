//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Database, type Entity, Filter, Obj, Query, Ref, Relation, Scope, Text, Type } from '@dxos/echo';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { DXN, EntityId } from '@dxos/keys';
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

/** A typename `query` or `search` cannot parse, such as an old `example.com/type/Name` form. */
export class InvalidTypenameError extends Schema.TaggedError<InvalidTypenameError>('InvalidTypenameError')(
  'InvalidTypenameError',
  { message: Schema.String },
) {}

/** An object `in` names that the database does not hold: the model's mistake, so an expected failure. */
export class UnknownParentError extends Schema.TaggedError<UnknownParentError>('UnknownParentError')(
  'UnknownParentError',
  { message: Schema.String },
) {}

/**
 * The plain dialect's bindings and what they cost, as the API reference lists them. Shared with MCP's `runScript`,
 * which runs this dialect too, so a client is told about the same bindings the agent is.
 */
export const PLAIN_API = trim`
    - \`print(...values)\` — adds a line to this call's output. Strings go through verbatim. An
      object prints as a card: its type, id, label and fields, refs as \`→ type id "label"\`. Print
      the object itself, never \`JSON.stringify\` it. Anything else prints as JSON, long strings and
      arrays cut with a \`…[+N chars]\` / \`… N more\` marker.
    - \`print(await describe(obj))\` — the card plus counts of the object's relations, children and
      referrers, with the call that fetches each — the only way to see that those exist.
    - \`await relations(obj, 'out' | 'in', typename?)\`, \`await children(obj)\`,
      \`await referrers(obj, typename?, field?)\` — the relations from or to an object, the objects
      it is the parent of, and the objects whose ref fields point at it.
    - \`await query(typename, props?, { feeds?, in? }?)\` — objects of that typename, optionally narrowed by exact
      property values, e.g. \`await query('com.example.type.task', { status: 'open' })\`. Pass
      \`{ feeds: true }\` to also match what feeds hold (mail, calendar events), and \`{ in: [obj] }\` to keep only
      objects under those (a feed, a collection).
    - \`await get(idOrRef)\` — the stored object an id or a reference names: \`ref(obj)\`, a \`Ref\` field, or the
      \`{ "/": uri }\` an operation returns; \`undefined\` when there is none.
    - \`await search(text, typename?, { feeds?, in? }?)\` — objects whose text matches, by full-text search,
      optionally of one typename, with the same options as \`query\`.
    - \`await make(typename, props)\` — a new object; it is not stored until you add it.
    - \`await add(obj)\` / \`await remove(obj)\` — store or delete an object.
    - \`update(obj, (obj) => { obj.field = value; })\` — the only way to change a stored object.
    - \`await flush()\` — waits for pending writes to land; call it before printing a final
      confirmation.
    - \`ref(obj)\` — a reference to an object you hold. A \`Ref<typename>\` field takes one, never
      an id or a URI string: \`await make('com.example.type.task', { title: 'Review', owner: ref(person) })\`.
      Where an operation's input takes references, pass \`ref(obj)\` too.

    These bindings run against a database this evaluation already has open, so each call is a local read or write.
    An \`ops\` call is a remote invocation that opens its own database, and can take seconds. Read and change
    objects with the bindings, even where a skill names a tool for it: read with \`get\`, \`query\` or \`search\`,
    and change with \`update\`. One case still takes an operation, when it is listed: creating or deleting an object
    the user should find in a collection, which the space operations that add and remove objects file into its
    collection, or unlink.
`;

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

  operations: (operations) => renderPlainOperationList(operations),

  bindings: ({ runtime, operations, skills, print }: BindingsContext) => {
    const run = RuntimeProvider.runPromise(Effect.succeed(runtime));
    const describe = makeDescriber({ syntax: PLAIN_HINTS, skills });
    const anchor = (target: Obj.Unknown | string): Query.Any =>
      Query.select(Filter.id(typeof target === 'string' ? target : target.id));
    return {
      print,
      console: printingConsole(print),

      /** The object's card with what only a query can tell: its relations, children and referrers. */
      describe: (value: unknown) =>
        run(
          Effect.gen(function* () {
            const id = Obj.isObject(value) || Relation.isRelation(value) ? undefined : objectIdOf(value);
            const stored = id === undefined ? undefined : yield* findById(id);
            return yield* describe(stored ?? value);
          }),
        ),

      /** Relations whose source (`out`) or target (`in`) is the object, optionally of one relation type. */
      relations: (target: Obj.Unknown | string, direction: 'out' | 'in' = 'out', type?: string) =>
        run(
          Database.query(
            direction === 'out'
              ? anchor(target).sourceOf(type === undefined ? undefined : typeURI(type))
              : anchor(target).targetOf(type === undefined ? undefined : typeURI(type)),
          ).run,
        ),

      /** Objects whose parent is the object. */
      children: (target: Obj.Unknown | string) => run(Database.query(anchor(target).children()).run),

      /** Objects whose `field` (any field when omitted) references the object, optionally of one type. */
      referrers: async (target: Obj.Unknown | string, type?: string, field?: string) => {
        const referrers = await run(
          Database.query(
            type === undefined ? anchor(target).referencedBy() : anchor(target).referencedBy(typeURI(type)),
          ).run,
        );
        // Narrowed here rather than in the query: the field is a name the model typed, which the
        // query's typed overload cannot take.
        const id = typeof target === 'string' ? target : target.id;
        return field === undefined ? referrers : referrers.filter((referrer) => referencesVia(referrer, field, id));
      },

      /** Objects of `typename`, optionally narrowed by exact property values. */
      query: (typename: string, props?: Record<string, unknown>, options?: QueryOptions) =>
        run(
          Effect.gen(function* () {
            return yield* Database.query(yield* scoped(yield* typeQuery(typename, props), options)).run;
          }),
        ),

      /** The stored object an id or a reference names, or undefined when there is none. */
      get: (target: unknown) =>
        run(
          Ref.isRef(target)
            ? Effect.tryPromise(() => target.tryLoad()).pipe(Effect.orElseSucceed(() => undefined))
            : Effect.suspend(() => {
                const id = idOf(target);
                return id === undefined ? Effect.succeed(undefined) : findById(id);
              }),
        ),

      /** Objects whose text matches `text`, by full-text search, optionally of one typename. */
      search: (text: string, typename?: string, options?: QueryOptions) =>
        run(
          Effect.gen(function* () {
            // Flushed first, so what this evaluation just wrote is in the full-text index, which lags the primary one.
            yield* Database.flush({ secondaryIndexes: true });
            const matches = Query.select(Filter.text(text, { type: 'full-text' }));
            const typed = typename === undefined ? matches : matches.select(yield* typeFilter(typename));
            return yield* Database.query(yield* scoped(typed, options)).run;
          }),
        ),

      /** Creates an unpersisted object of `typename`; pass it to `add` to store it. */
      make: (typename: string, props: Record<string, unknown>) =>
        run(
          Effect.gen(function* () {
            const { db } = yield* Database.Service;
            // Matched on the typename rather than by URI: a registered type is indexed under its
            // VERSIONED DXN, and the model names a type the same way it does in a query —
            // unversioned. Objects only: a relation needs a source and target `make` cannot take.
            const registered = () =>
              db.registry.list().find((entity) => Type.isType(entity) && Type.getTypename(entity) === typename);
            // A type the registry lacks is asked of the graph's type sources: on EDGE an agent's database registers
            // only its own types, and the rest are published by the plugin bundles that contribute them. A name that
            // is not a valid unversioned typename, or a resolver that fails, is an unknown type, never a defect.
            const resolved = (): Effect.Effect<unknown> =>
              Schema.is(DXN.NameSchema)(typename)
                ? Effect.tryPromise(
                    () =>
                      db.graph
                        .createRefResolver({ context: { space: db.spaceId } })
                        .resolveType?.(DXN.make(typename)) ?? Promise.resolve(undefined),
                  ).pipe(Effect.orElseSucceed(() => undefined))
                : Effect.succeed(undefined);
            const type = registered() ?? (yield* resolved());
            if (type !== undefined && Type.isType(type) && Type.isRelation(type)) {
              return yield* Effect.fail(
                new UnknownObjectTypeError({
                  typename,
                  message: `${typename} is a relation type; make creates objects only`,
                }),
              );
            }
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
      update: (obj: Obj.Unknown, mutator: (obj: any) => void) => Obj.update(obj, (obj) => mutator(diffingStrings(obj))),

      ops: guardOperations(
        Object.fromEntries(
          operations.flatMap((operation) => {
            const invoke = (input: unknown = {}) => run(operation.invoke(input));
            // Bound under the tool name and its camelCase form: the derived names are kebab-case,
            // which is not an identifier, so `ops.researchOrg` would otherwise have to be bracketed.
            // Also under the operation's key, with and without `dxn:`, since the Skill Manager says an
            // operation is called by its key or its tool name.
            const key =
              operation.key ?? (operation.definition === undefined ? undefined : String(operation.definition.meta.key));
            const keys = key === undefined ? [] : [...new Set([key, key.replace(/^dxn:/, '')])];
            return [operation.name, camelCase(operation.name), ...keys].map((name) => [name, invoke] as const);
          }),
        ),
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
    per step. Each call is a fresh program: nothing defined in an earlier call exists in the next,
    so load again what you need. Print the specific values you need to reason about, not whole objects, and keep the
    output small. Stay on the objects the request names or the conversation is attached to: reading
    or changing others the request did not ask about spends calls and risks unasked-for writes.

    ### API

    ${PLAIN_API}

    ${renderTypes(types?.filter(({ kind }) => kind === 'object'))}

    ${operations.length > 0 ? renderPlainOperations(operations) : NO_OPERATIONS}
  `,
};

/**
 * The object a mutator writes through: a string assigned over a string is written as a diff (`Text.update`), which keeps
 * cursors and merges with concurrent edits, instead of replacing the whole text, the way a text operation edits it.
 */
const diffingStrings = <T extends Obj.Unknown>(target: T): T =>
  new Proxy(target, {
    get: (object, key) => Reflect.get(object, key),
    set: (object, key, value) => {
      if (typeof key === 'string' && typeof value === 'string' && typeof Reflect.get(object, key) === 'string') {
        Text.update(object, key, value);
        return true;
      }
      return Reflect.set(object, key, value);
    },
  });

/** Names `ops` answers although no operation is bound under them: the hooks JSON, promises and inspection read. */
const OPERATION_PASSTHROUGH = new Set(['then', 'toJSON', 'inspect']);

/**
 * `ops` as the code reaches it: a name no bound operation has throws saying what to use, rather than the bare "is not
 * a function". That includes an operation a binding replaces, which a skill's instructions may still name.
 */
const guardOperations = <T extends Record<string, unknown>>(ops: T): T =>
  new Proxy(ops, {
    get: (target, name, receiver) => {
      if (typeof name !== 'string' || name in target || OPERATION_PASSTHROUGH.has(name)) {
        return Reflect.get(target, name, receiver);
      }
      throw new Error(
        `ops[${JSON.stringify(name)}] is not offered in code. Read and change objects with get, query, search and ` +
          'update; call only the operations listed under Operations.',
      );
    },
  });

/** The calls a described object's hints show, in this dialect's facade. */
const PLAIN_HINTS: HintSyntax = {
  relations: (id, relation, direction) => `await relations('${id}', '${direction}', '${relation}')`,
  children: (id) => `await children('${id}')`,
  referrers: (id, type, field) => `await referrers('${id}', '${type}'${field === undefined ? '' : `, '${field}'`})`,
};

/**
 * The id of the object `describe` is given in another form, since a card of its JSON counts none of its relations: the
 * id itself, an object's JSON (as an operation answers), or a record with exactly one field holding an object
 * (`{ object }`, or a `{ task, note }` the code built). Only an object id counts, so a wrapper's own id does not hide
 * the object it holds; an array names no single object.
 */
const objectIdOf = (value: unknown): EntityId | undefined => {
  if (Predicate.isString(value)) {
    return EntityId.isValid(value) ? value : undefined;
  }
  if (!Predicate.isObject(value)) {
    return undefined;
  }
  if (Predicate.isString(value.id) && EntityId.isValid(value.id)) {
    return value.id;
  }
  const ids = Object.values(value).flatMap((field) =>
    Predicate.isObject(field) && Predicate.isString(field.id) && EntityId.isValid(field.id) ? [field.id] : [],
  );
  return ids.length === 1 ? ids[0] : undefined;
};

/** What `query` and `search` take after their filters: whether to read feeds, and the objects to read under. */
type QueryOptions = {
  /** Also match what feeds hold (mail, calendar events), which a query of the space's objects does not reach. */
  readonly feeds?: boolean;
  /** Only objects under these (a feed, a collection): objects, references or ids. */
  readonly in?: readonly unknown[];
};

/**
 * The filter for objects of a typename, as `space.queryObjects` builds it: the bare typename, plus every copy of the
 * type stored in the space, since objects of a stored type carry its `echo:` id, which the typename does not match.
 */
const storedTypes = (typename: string) =>
  Schema.is(DXN.NameSchema)(typename)
    ? Effect.map(
        Database.query(
          Query.select(Filter.and(Filter.type(Type.Type), Filter.key(typename))).from(Scope.space(), Scope.registry()),
        ).run,
        (declared) => declared.filter((type) => Type.getDatabase(type) != null),
      )
    : Effect.fail(
        new InvalidTypenameError({
          message:
            `'${typename}' is not a typename: typenames look like 'org.dxos.type.document'. ` +
            'Look them up with the type lookup operation rather than guessing.',
        }),
      );

const typeFilter = (typename: string) =>
  Effect.map(storedTypes(typename), (stored) =>
    stored.length === 0
      ? Filter.type(DXN.make(typename))
      : Filter.or(Filter.type(DXN.make(typename)), ...stored.map((type) => Filter.type(type))),
  );

/**
 * Objects of a typename with these property values. With a stored copy of the type, the properties narrow in a second
 * step: the planner takes them on a type filter, but not inside the `Filter.or` the copy adds.
 */
const typeQuery = (typename: string, props?: Record<string, unknown>) =>
  Effect.gen(function* () {
    const stored = yield* storedTypes(typename);
    if (stored.length === 0) {
      return Query.select(Filter.type(DXN.make(typename), props));
    }
    const filter = Filter.or(Filter.type(DXN.make(typename)), ...stored.map((type) => Filter.type(type)));
    return props === undefined ? Query.select(filter) : Query.select(filter).select(Filter.props(props));
  });

/**
 * A query narrowed to what sits under `in`, reading feeds when asked or when `in` is given: a feed's content is reached
 * only through its feed.
 */
const scoped = (query: Query.Any, options: QueryOptions | undefined) =>
  Effect.gen(function* () {
    const parents = yield* Effect.forEach(options?.in ?? [], parentOf);
    const narrowed = parents.length > 0 ? query.select(Filter.childOf(parents)) : query;
    if (options?.feeds !== true && parents.length === 0) {
      return narrowed;
    }
    // Scoped to this space's database: feeds named without a space match nothing in the index.
    const { db } = yield* Database.Service;
    return narrowed.from(db, { includeFeeds: true });
  });

/** An object `in` names: an object or reference as it is, an id as the stored object. */
const parentOf = (target: unknown): Effect.Effect<Obj.Unknown | Ref.Unknown, UnknownParentError, Database.Service> =>
  Effect.gen(function* () {
    if (Obj.isObject(target) || Ref.isRef(target)) {
      return target;
    }
    const id = idOf(target);
    const found = id === undefined ? undefined : yield* findById(id);
    return Obj.isObject(found)
      ? found
      : yield* Effect.fail(
          new UnknownParentError({
            message: `in takes objects, references or ids; ${JSON.stringify(target)} is none.`,
          }),
        );
  });

/** The id that an id, a URI, a `{ "/": uri }` envelope or an object (`objectIdOf`) names. */
const idOf = (target: unknown): EntityId | undefined => {
  if (Predicate.isString(target)) {
    return EntityId.isValid(target) ? target : lastSegmentId(target);
  }
  if (Predicate.isObject(target) && Predicate.isString(target['/'])) {
    return lastSegmentId(target['/']);
  }
  return objectIdOf(target);
};

/** The id that ends a URI: `echo://<space>/<id>` and `dxn:echo:@:<id>` alike. */
const lastSegmentId = (uri: string): EntityId | undefined => {
  const id = uri.split(/[/:]/).at(-1);
  return id !== undefined && EntityId.isValid(id) ? id : undefined;
};

/** The stored object with `id`, or undefined when the database has no such object. */
const findById = (id: EntityId): Effect.Effect<Entity.Unknown | undefined, never, Database.Service> =>
  Database.query(Filter.id(id)).run.pipe(
    Effect.map(([found]) => found),
    Effect.orElseSucceed(() => undefined),
  );

/** Whether `object`'s `field` holds a ref (directly or in an array) to the object `id`. */
const referencesVia = (object: object, field: string, id: string): boolean => {
  const value: unknown = Reflect.get(object, field);
  return (Array.isArray(value) ? value : [value]).some((ref) => Ref.isRef(ref) && String(ref.uri).endsWith(`/${id}`));
};

/** A type named by typename, as `query` takes it, or by the versioned DXN a hint names it by. */
const typeURI = (type: string) => (DXN.isDXN(type) ? type : DXN.make(type));

const renderPlainOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills' instructions describe their capabilities as tools; in code mode they are NOT tools. Each one
  is an async function on \`ops\`, taking one argument matching its parameter schema. A failed
  operation throws, so wrap a call you expect to fail in \`try\`/\`catch\`. The names are kebab-case,
  so they are indexed rather than dotted.

  ${renderPlainOperationList(operations)}
`;

const renderPlainOperationList = (operations: readonly SandboxOperation[]): string =>
  operations
    .map((operation) => renderOperation(operation, (name) => `await ops[${JSON.stringify(name)}](input)`))
    .join('\n');

/** The identifier form of a kebab-case tool name, which the plain dialect binds alongside it. */
export const camelCase = (name: string): string =>
  name.replace(/[-_]([a-z0-9])/g, (_, char: string) => char.toUpperCase());
