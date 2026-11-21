# Global services: remove space and process affinity

Status: proposal. Scope: `@dxos/compute` (`LayerSpec`, `ServiceResolver`, `Process`), `@dxos/compute-runtime`
(`LayerStack`, `ProcessManager`), `@dxos/echo` (`Database`, `Hypergraph`), and every `LayerSpec` with
`affinity: 'space' | 'process'` in dxos and edge.

## Summary

Today a `LayerSpec` declares an `affinity` (`application`, `space`, `process`). `LayerStack` builds one
slice per space and one per process, and a space slice gets its space from the `LayerContext` it is
built with. So "which space am I in" is answered when the layer is **built**, and the answer is baked
into the service instance (`Database.Service` holds one `db`).

This proposal moves the answer from build time to **call time**:

1. Every service is built once, for the whole application. `LayerSpec.affinity`, `LayerContext` and
   `ServiceResolver.ResolutionContext` are removed.
2. The process a fiber runs in is ambient, fiber-local data: `Process.Current`, a `Context.Reference`
   set by `ProcessManager` on the process fiber. It carries the pid, parent pid, space, conversation,
   cancellation signal and guard.
3. A global service that needs a space or a process reads `Process.Current` inside the method it runs,
   or takes the space/pid as an explicit argument. Per-space or per-process state lives in the service,
   in a keyed cache (`SpaceScoped` / `ProcessScoped`, below), not in a separate layer instance.

The 883 files that use `Database.Service` keep compiling: the `Database.*` helpers keep their
signatures and resolve the current space themselves.

## Why

- **A service can serve more than one space.** Cross-space work (`Hypergraph.Service`, the
  `RemoteProcessManager`, `RemoteOperationInvoker`) already had to be application-scoped and take the
  space per call, so the codebase has two shapes for the same thing.
- **Layer graph pruning hides errors.** A space spec that requires a process service is pruned
  silently; a missing `space` in a spawn environment fails at slice build with a hint, far from the call.
- **Precedence by affinity is implicit.** `RemoteFactStorePlugin` overrides `MemoryService` by
  contributing it with a higher affinity (`process` outranks `space`). That is an accident of the slice
  lookup order, not an API.
- **Slices cost.** Each space keeps a keep-alive slice of every space spec; each process builds and
  destroys a slice.

## Design

### Ambient process context

`Process.EnvironmentService` (a `Context.Service` added to the process context by `ProcessManager`)
becomes `Process.Current`, a `Context.Reference` with a default of "no process". A reference, not a
service, because global services are shared across fibers, and "current" must be per fiber.

```ts
// BEFORE — packages/core/compute/compute/src/Process.ts
export interface Environment {
  readonly space?: SpaceId;
  readonly conversation?: URI.URI;
}

export class EnvironmentService extends Context.Service<EnvironmentService, Environment>()(
  '@dxos/compute/Process.EnvironmentService',
) {}

export const currentEnvironment: Effect.Effect<Environment> = Effect.serviceOption(EnvironmentService).pipe(
  Effect.map(Option.getOrElse((): Environment => ({}))),
);

export class GuardService extends Context.Service<GuardService, Guard>()('@dxos/compute/Process.GuardService') {}
```

```ts
// AFTER — packages/core/compute/compute/src/Process.ts
export interface Environment {
  readonly space?: SpaceId;
  readonly conversation?: URI.URI;
}

/** What the running fiber knows about the process it runs in. */
export interface Info {
  readonly pid: ID;
  readonly parentPid?: ID;
  readonly environment: Environment;
  /** Fires when the process is terminated (replaces `Cancellation.Service`). */
  readonly signal: AbortSignal;
  /** Replaces `GuardService`. */
  readonly guard?: Guard;
}

/**
 * The process the current fiber runs in. A fiber-local reference rather than a service, since one global
 * service instance is called from many processes.
 */
export class Current extends Context.Reference<Current>()('@dxos/compute/Process.Current', {
  defaultValue: (): Option.Option<Info> => Option.none(),
}) {}

/** The current process; fails outside a process. */
export const current: Effect.Effect<Info, NoProcessError>;

/** Current pid; fails outside a process. */
export const pid: Effect.Effect<ID, NoProcessError>;

/** The environment, `{}` outside a process (same contract as the old `currentEnvironment`). */
export const environment: Effect.Effect<Environment>;

/** The current space; fails when the fiber has none. */
export const space: Effect.Effect<SpaceId, NoSpaceError>;

/** The current conversation; fails when the fiber has none. */
export const conversation: Effect.Effect<URI.URI, NoConversationError>;

/**
 * Runs `effect` with `patch` merged into the current environment, without spawning a process.
 * This is how work that finds its space at run time then uses the ordinary space-scoped helpers.
 */
export const withEnvironment: {
  (patch: Partial<Environment>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
};

/** Shorthand for `withEnvironment({ space })`. */
export const withSpace: (space: SpaceId) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;

export class NoProcessError extends BaseError.extend('NoProcessError', 'Not running in a process.') {}
export class NoSpaceError extends BaseError.extend('NoSpaceError', 'No space in the current environment.') {}
export class NoConversationError extends BaseError.extend(
  'NoConversationError',
  'No conversation in the current environment.',
) {}
```

Rule for implementers of a global service: **read `Process.Current` in the caller's fiber.** A service
that hands work to its own long-lived fiber (a queue worker, a debounced flush) must capture
`Process.Current` at the call and pass it along; the worker fiber has none.

Full process data stays on the manager: `Process.ManagerService.get(pid)` / `list({ space })` are
unchanged, so a service that has a pid can still read the rest.

### Per-space and per-process state inside a global service

Space slices were keep-alive caches. A global service that needs per-space state (a store handle, a
subscription) keeps it in a keyed cache. One helper, so every service does it the same way:

```ts
// NEW — packages/core/compute/compute/src/SpaceScoped.ts
// @import-as-namespace

/**
 * A per-space cache inside a global service. Entries are built on first use and held until the space
 * closes (or `idleTimeToLive` passes with no user).
 */
export interface SpaceScoped<S> {
  /** The entry for `space`, built on first use. */
  readonly get: (space: SpaceId) => Effect.Effect<S, SpaceNotFoundError>;
  /** The entry for `Process.space`. */
  readonly current: Effect.Effect<S, NoSpaceError | SpaceNotFoundError>;
}

export const make: <S, E, R>(
  build: (space: SpaceId) => Effect.Effect<S, E, R | Scope.Scope>,
  options?: { readonly idleTimeToLive?: Duration.DurationInput },
) => Effect.Effect<SpaceScoped<S>, never, R | Scope.Scope>; // backed by RcMap<SpaceId, S>
```

```ts
// NEW — packages/core/compute/compute/src/ProcessScoped.ts
/** A per-process cache inside a global service; entries are released when the process exits. */
export interface ProcessScoped<S> {
  readonly get: (pid: Process.ID) => Effect.Effect<S>;
  readonly current: Effect.Effect<S, NoProcessError>;
}

export const make: <S, E, R>(
  build: (info: Process.Info) => Effect.Effect<S, E, R | Scope.Scope>,
) => Effect.Effect<ProcessScoped<S>, never, R | Scope.Scope | Process.ManagerService>; // invalidates on exit
```

### LayerSpec, LayerStack, ServiceResolver

```ts
// BEFORE — packages/core/compute/compute/src/LayerSpec.ts
export type Affinity = 'application' | 'space' | 'process';

export interface LayerContext {
  readonly space?: SpaceId;
  readonly conversation?: URI.URI;
  readonly process?: Process.ID;
}

export interface LayerSpec {
  readonly [TypeId]: TypeId;
  readonly affinity: Affinity;
  readonly requires: readonly Context.Key<any, any>[];
  readonly provides: readonly Context.Key<any, any>[];
  readonly eager: boolean;
  readonly make: (context: LayerContext) => Layer.Layer<unknown, never, unknown>;
}

export const make: (
  opts: { affinity: Affinity; requires: Key[]; provides: Key[]; eager?: boolean },
  make: (context: LayerContext) => Layer.Layer<Provides, never, Requires>,
) => LayerSpec;
```

```ts
// AFTER — packages/core/compute/compute/src/LayerSpec.ts
export interface LayerSpec {
  readonly [TypeId]: TypeId;
  readonly requires: readonly Context.Key<any, any>[];
  readonly provides: readonly Context.Key<any, any>[];
  readonly eager: boolean;
  /**
   * Higher wins when two specs provide the same tag. Replaces "process affinity outranks space
   * affinity", which was the only way to override a service.
   * @default 0
   */
  readonly priority: number;
  readonly make: () => Layer.Layer<unknown, never, unknown>;
}

export const make: (
  opts: { requires: Key[]; provides: Key[]; eager?: boolean; priority?: number },
  make: () => Layer.Layer<Provides, never, Requires>,
) => LayerSpec;
```

```ts
// BEFORE — packages/core/compute/compute/src/ServiceResolver.ts
export interface ResolutionContext {
  readonly identity?: string;
  readonly space?: SpaceId;
  readonly conversation?: URI.URI;
  readonly process?: Process.ID;
}

export interface ServiceResolver {
  resolve<Tag extends Context.Key<any, any>>(
    tag: Tag,
    context: ResolutionContext,
  ): Effect.Effect<Context.Service.Shape<Tag>, ServiceNotAvailableError, Scope.Scope>;
}

export const resolveAll: (tags, context: ResolutionContext) => Effect.Effect<Context.Context<...>, ...>;
export const succeed: (tag, getService: (context: ResolutionContext) => Effect<S, ...>) => ServiceResolver;
```

```ts
// AFTER — packages/core/compute/compute/src/ServiceResolver.ts
export interface ServiceResolver {
  resolve<Tag extends Context.Key<any, any>>(
    tag: Tag,
  ): Effect.Effect<Context.Service.Shape<Tag>, ServiceNotAvailableError, Scope.Scope>;
}

export const resolveAll: (tags) => Effect.Effect<Context.Context<...>, ServiceNotAvailableError, Scope.Scope | ServiceResolver>;
export const succeed: (tag, getService: () => Effect<S, ServiceNotAvailableError, Scope.Scope>) => ServiceResolver;
// `ResolutionContext` is deleted. The process context reaches services through `Process.Current`.
```

```ts
// BEFORE — packages/core/compute/compute-runtime/src/LayerStack.ts
class LayerStack {
  addLayers(layers: LayerSpec[]): void;          // routed into per-affinity slices
  initialize(context: LayerSpec.LayerContext): Effect<void>;
  resolve(tags, context: LayerSpec.LayerContext): Effect<Context<...>>;
  // slices: one application, one per space (keep-alive), one per process (ref-counted)
}
```

```ts
// AFTER — packages/core/compute/compute-runtime/src/LayerStack.ts
class LayerStack {
  addLayers(layers: LayerSpec[]): void;          // one graph; ties on a tag broken by `priority`
  initialize(): Effect<void>;                    // builds eager specs
  resolve(tags): Effect<Context<...>>;
  // one slice, keep-alive for the life of the stack
}
```

`ProcessManager` stops building a process slice. When it runs a process it resolves the handler's
declared services once from the stack, and provides `Process.Current` on the process fiber:

```ts
// BEFORE — ProcessManager.ts (process context)
originContext(origin).pipe(
  Context.add(Process.EnvironmentService, environment),
  Context.add(StorageService.StorageService, storage),
  Context.add(Cancellation.Service, { signal: cancellation.signal }),
  Context.add(Trace.TraceService, createProcessTraceService({ pid: id, space: environment.space, ... })),
  Context.add(Process.GuardService, guard),
  ...
);
const services = yield* resolver.resolveAll(definition.services, { space, conversation, process: id });
```

```ts
// AFTER — ProcessManager.ts
const services = yield * resolver.resolveAll(definition.services); // all global
effect.pipe(
  Effect.provideContext(services),
  Effect.provideService(Process.Current, Option.some({ pid: id, parentPid, environment, signal, guard })),
);
```

### Database

`Database.Service` holds one space's `db` today, and `Hypergraph.Service` is the cross-space handle.
Once nothing is per-space they are the same service, so they merge.

```ts
// BEFORE — packages/core/echo/echo/src/Database.ts
export class Service extends Context.Service<Service, { readonly db: Database }>()('@dxos/echo/Database/Service') {}

export const notAvailable: Layer.Layer<Service>;
export const makeService: (db: Database) => Service['Service'];
export const layer: (db: Database) => Layer.Layer<Service>;

export const spaceId: Effect.Effect<SpaceId, never, Service>;
export const withSpaceId: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R | Service>;
export const resolve: (ref: URI.URI | Ref<any>, schema?) => Effect<Entity, EntityNotFoundError, Service>;
export const makeRef: (uri: URI.URI) => Effect<Ref<T>, never, Service>;
export const add: (obj: T) => Effect<T, never, Service>;
export const addType: (type: T) => Effect<T, never, Service>;
export const remove: (obj: T) => Effect<void, never, Service>;
export const appendToFeed: (feed, entities) => Effect<void, never, Service>;
export const deleteFromFeed: (feed, entities) => Effect<void, never, Service>;
export const flush: (opts?) => Effect<void, never, Service>;
export const runGarbageCollection: (options?) => Effect<..., never, Service>;
export const retainObjects: (keep) => Effect<..., never, Service>;
export const stats: () => Effect<DatabaseStats, never, Service>;
export const beginMigration: (options?) => Effect<Migration.Transaction, MigrationError, Service>;
export const query: (queryOrFilter) => QueryResultEffect<T, never, Service>;
export const load: (ref, options?) => Effect<T, EntityNotFoundError, never>;
export const peek: (ref) => T | undefined;

// packages/core/echo/echo/src/Hypergraph.ts
export class Service extends Context.Service<Service, { readonly graph: Hypergraph }>()('@dxos/echo/Hypergraph/Service') {}
export const layer: (graph: Hypergraph) => Layer.Layer<Service>;
export const notAvailable: Layer.Layer<Service>;
export const withDatabase: (spaceId: SpaceId) => Layer.Layer<Database.Service, SpaceNotFoundError, Service>;
```

```ts
// AFTER — packages/core/echo/echo/src/Database.ts
export class Service extends Context.Service<
  Service,
  {
    /** Every open space; cross-space queries go here. */
    readonly graph: Hypergraph.Hypergraph;
    /** The database of `space`, waiting until it is ready. */
    readonly get: (space: SpaceId) => Effect.Effect<Database, SpaceNotFoundError>;
  }
>()('@dxos/echo/Database/Service') {}

/** Service over a graph: `get` reads `graph.getDatabase` and waits for `waitUntilReady`. */
export const layer: (graph: Hypergraph.Hypergraph) => Layer.Layer<Service>;

/**
 * Test and single-space hosts (an EDGE space Durable Object): a service that knows one database, plus
 * `Process.Current` defaulted to that space so the helpers below work without a process.
 */
export const layerSingle: (db: Database) => Layer.Layer<Service>;

export const notAvailable: Layer.Layer<Service>;

/** The database of `Process.space`. */
export const current: Effect.Effect<Database, NoSpaceError | SpaceNotFoundError, Service>;
/** Same, `Option.none()` outside a space. */
export const currentOption: Effect.Effect<Option.Option<Database>, SpaceNotFoundError, Service>;
/** The database of an explicit space. */
export const forSpace: (space: SpaceId) => Effect.Effect<Database, SpaceNotFoundError, Service>;

/** Now read from `Process.Current`, not the service; no `Service` requirement. */
export const spaceId: Effect.Effect<SpaceId, NoSpaceError>;

/** Run `effect` against another space (`Process.withSpace`). Replaces `Hypergraph.withDatabase`. */
export const withSpace: (space: SpaceId) => <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>;

// Helpers keep their signatures; each one resolves `current` itself. A missing space is a defect
// (`Effect.die(NoSpaceError)`), as a missing `space` in the spawn environment is today, so no call
// site changes its error channel. Each gains an optional `{ space }` to address another space.
export const add: (obj: T, options?: { space?: SpaceId }) => Effect<T, never, Service>;
export const remove: (obj: T, options?: { space?: SpaceId }) => Effect<void, never, Service>;
export const query: (queryOrFilter, options?: { space?: SpaceId }) => QueryResultEffect<T, never, Service>;
export const makeRef: (uri: URI.URI) => Effect<Ref<T>, never, Service>;
export const addType: (type: T, options?: { space?: SpaceId }) => Effect<T, never, Service>;
export const appendToFeed: (feed, entities) => Effect<void, never, Service>;   // space from the feed
export const deleteFromFeed: (feed, entities) => Effect<void, never, Service>; // space from the feed
export const flush: (opts?: FlushOptions & { space?: SpaceId }) => Effect<void, never, Service>;
export const runGarbageCollection: (options?: GarbageCollectionOptions & { space?: SpaceId }) => Effect<..., never, Service>;
export const retainObjects: (keep, options?: { space?: SpaceId }) => Effect<..., never, Service>;
export const stats: (options?: { space?: SpaceId }) => Effect<DatabaseStats, never, Service>;
export const beginMigration: (options?: TransactionOptions & { space?: SpaceId }) => Effect<Transaction, MigrationError, Service>;

/**
 * An absolute `echo://<space>/<object>` URI resolves in its own space; a relative one in the current
 * space. Today every URI resolves against the slice's space.
 */
export const resolve: (ref: URI.URI | Ref<any>, schema?) => Effect<Entity, EntityNotFoundError, Service>;

export const load: (ref, options?) => Effect<T, EntityNotFoundError, never>; // unchanged
export const peek: (ref) => T | undefined;                                   // unchanged

// `withSpaceId` (span annotation) is kept; it reads `Process.Current` and drops the `Service` requirement.
// `makeService(db)` is deleted: build with `layer(graph)` or `layerSingle(db)`.

// packages/core/echo/echo/src/Hypergraph.ts
// `Hypergraph.Service`, `Hypergraph.layer`, `Hypergraph.notAvailable`, `Hypergraph.withDatabase` are deleted.
// The `Hypergraph` interface itself stays; it is `Database.Service.graph`.
```

Call sites:

```ts
// BEFORE: an operation that has to find its space.
Effect.gen(function* () {
  const { graph } = yield* Hypergraph.Service;
  const space = findSpaceFor(graph, input);
  return yield* doWork(input).pipe(Effect.provide(Hypergraph.withDatabase(space)));
});

// AFTER
Effect.gen(function* () {
  const { graph } = yield* Database.Service;
  const space = findSpaceFor(graph, input);
  return yield* doWork(input).pipe(Database.withSpace(space));
});

// BEFORE: direct access to the db object.
const { db } = yield * Database.Service;
db.query(Filter.type(Task)).run();

// AFTER
const db = yield * Database.current;
db.query(Filter.type(Task)).run();

// Unchanged: the helper form, which is most of the 883 files.
const tasks = yield * Database.query(Filter.type(Task)).run;
```

Declaring `Database.Service` in an operation's `services` no longer means "this operation acts on a
space". Operations that need a space say so on the definition, so the invoker can refuse a call with no
space before the handler runs (today's behaviour, which moves from layer resolution to validation):

```ts
// AFTER — packages/core/compute/compute/src/Operation.ts
Operation.make({
  key: '...',
  services: [Database.Service],
  requiresSpace: true, // new; invoker fails with NoSpaceError if the environment has no space
});
```

### Other services

Each row is one `LayerSpec` today with `affinity: 'space'` or `'process'`. After the change every one
is application-wide.

| Service                                                                                                                  | Now                                   | Change to the public shape                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------- |
| `Database.Service`                                                                                                       | space                                 | Merged with `Hypergraph.Service` (above).                                        |
| `Credential.CredentialsService`                                                                                          | space                                 | Query takes an optional `space`.                                                 |
| `AiService.AiService`                                                                                                    | space                                 | None; looks credentials up per call.                                             |
| `RdfStore.RdfStore`                                                                                                      | space                                 | Shape kept; `forSpace(space)` added.                                             |
| `MemoryService.MemoryService`                                                                                            | space (and process, as an override)   | Shape kept; `forSpace(space)` added; override by `priority`.                     |
| `FactStore` (pipeline-rdf)                                                                                               | space                                 | Shape kept; `forSpace(space)` added.                                             |
| `BrainService.BrainService`                                                                                              | space                                 | Shape kept; `forSpace(space)` added.                                             |
| `Registry.Service` (operations)                                                                                          | space override of app                 | One application spec.                                                            |
| `FeedTraceSink.FeedTraceSink`                                                                                            | space                                 | Deleted; the routing `Capabilities.TraceSink` already routes by span space.      |
| `TriggerDispatcher`                                                                                                      | space                                 | One dispatcher over every open space.                                            |
| `Trigger.ManagerService`                                                                                                 | space                                 | Trigger state carries its space; `triggers` filterable by space.                 |
| `RemoteTriggerManager.Service`                                                                                           | space                                 | `fromClient(client)` with no space.                                              |
| `HarnessService`                                                                                                         | process                               | Shape kept; conversation from `Process.conversation`.                            |
| `ShellService.ShellService`                                                                                              | process                               | None; one shell spawner.                                                         |
| Process built-ins (`StorageService`, `Trace.TraceService`, `Cancellation.Service`, `GuardService`, `EnvironmentService`) | added per process by `ProcessManager` | Global, keyed by `Process.pid`; cancellation and guard move into `Process.Info`. |

#### Credentials

```ts
// BEFORE — packages/core/compute/compute/src/Credential.ts
export interface CredentialQuery {
  service?: string;
  // ...
}

export class CredentialsService extends Context.Service<
  CredentialsService,
  {
    queryCredentials: (query: CredentialQuery) => Promise<ServiceCredential[]>;
    getCredential: (query: CredentialQuery) => Promise<ServiceCredential>;
  }
>()('@dxos/compute/Credential/CredentialsService') {}

// layer: credentialsLayerFromDatabase(): Layer<CredentialsService, never, Database.Service | AccessTokenResolver>
// spec:  affinity 'space', requires [Database.Service, AccessTokenResolver]
```

```ts
// AFTER
export interface CredentialQuery {
  service?: string;
  /** Space whose credentials to search; defaults to `Process.space`. */
  space?: SpaceId;
  // ...
}

export class CredentialsService extends Context.Service<
  CredentialsService,
  {
    queryCredentials: (query: CredentialQuery) => Effect.Effect<ServiceCredential[], NoSpaceError>;
    getCredential: (query: CredentialQuery) => Effect.Effect<ServiceCredential, NoSpaceError | CredentialNotFoundError>;
  }
>()('@dxos/compute/Credential/CredentialsService') {}

// layer: credentialsLayerFromDatabase(): Layer<CredentialsService, never, Database.Service | AccessTokenResolver>
// spec:  requires [Database.Service, AccessTokenResolver]
// The static helpers (`CredentialsService.getCredential`, `getApiKey`, `getApiKeyValue`) keep their
// signatures, since they read the space from the caller's fiber.
```

The methods move from `Promise` to `Effect`: a `Promise` method runs outside the caller's fiber, so it
cannot read `Process.Current`.

#### AiService

```ts
// BEFORE — plugin-assistant/src/capabilities/ai-service.ts
LayerSpec.make(
  { affinity: 'space', requires: [Credential.CredentialsService], provides: [AiService.AiService] },
  () => aiServiceLayer,
);
```

```ts
// AFTER
LayerSpec.make({ requires: [Credential.CredentialsService], provides: [AiService.AiService] }, () => aiServiceLayer);
// `AiService.AiService` shape unchanged. Resolvers read API keys with `CredentialsService.getApiKey` per
// request, so the key comes from the calling process's space. A resolver that caches a key keys the
// cache by space.
```

#### RdfStore, MemoryService, FactStore, BrainService

The same change for all four: the tag keeps its shape, operates on the current space, and gains a
`forSpace` accessor for code that has a space id in hand.

```ts
// BEFORE — echo-memory/src/MemoryService.ts
export interface Service {
  readonly put: (facts: readonly Fact.Fact[], options?: PutOptions) => Effect.Effect<number, MemoryError>;
  readonly query: <Q extends MemoryQuery.Any>(query: Q, ...) => Effect.Effect<..., MemoryError>;
  readonly reset: () => Effect.Effect<void, MemoryError>;
  readonly subscribe: (subscription: Subscription) => Effect.Effect<boolean, MemoryError>;
  readonly subscriptions: (...) => Effect.Effect<..., MemoryError>;
  readonly unsubscribe: (id: SubscriptionId) => Effect.Effect<boolean, MemoryError>;
  readonly take: (...) => Effect.Effect<..., MemoryError>;
  readonly ack: (events: readonly MemoryEventId[], ...) => Effect.Effect<..., MemoryError>;
}
export class MemoryService extends Context.Service<MemoryService, Service>()('@dxos/echo-memory/MemoryService') {}

// plugin-client spec: affinity 'space', (context) => Layer.succeed(MemoryService, client.memory(context.space))
```

```ts
// AFTER
export interface Service {
  // Same members; each acts on `Process.space` and fails with `MemoryError` (cause `NoSpaceError`)
  // outside a space.
  readonly put: ...;
  readonly query: ...;
  // ...
  /** The same API bound to an explicit space. */
  readonly forSpace: (space: SpaceId) => Omit<Service, 'forSpace'>;
}
export class MemoryService extends Context.Service<MemoryService, Service>()('@dxos/echo-memory/MemoryService') {}

/** Builds the global service from a per-space factory (`client.memory`), cached with `SpaceScoped`. */
export const fromFactory: (
  forSpace: (space: SpaceId) => Omit<Service, 'forSpace'>,
) => Effect.Effect<Service, never, Scope.Scope>;

// plugin-client spec: requires [ClientService], () => Layer.scoped(MemoryService, fromFactory(client.memory))
```

```ts
// RdfStore — the same pattern.
// BEFORE: Layer.succeed(RdfStore.RdfStore, client.rdf(context.space))   // affinity 'space'
// AFTER:  Layer.scoped(RdfStore.RdfStore, RdfStore.fromFactory(client.rdf)); `RdfStore.Service` gains `forSpace`.

// FactStore (pipeline-rdf) — the same pattern.
// BEFORE: affinity 'space', requires [MemoryService], () => FactStoreMemory.layer
// AFTER:  requires [MemoryService], () => FactStoreMemory.layer      // reads the space per call via MemoryService

// BrainService (plugin-agent) — the same pattern.
// BEFORE: affinity 'space', requires [AgentService, MemoryService], () => BrainMemory.layer({ triggers })
// AFTER:  requires [AgentService, MemoryService], () => BrainMemory.layer({ triggers })
//         BrainService.Service gains `forSpace`; `wake` keeps `R = Database.Service`.
```

The remote fact store override:

```ts
// BEFORE — plugin-brain/src/RemoteFactStorePlugin.ts
// "a process-affinity spec outranks the client's space memory"
LayerSpec.make({ affinity: 'space', requires: [], provides: [FactStore] }, () =>
  Layer.succeed(FactStore, operationStore),
);
LayerSpec.make({ affinity: 'process', requires: [], provides: [MemoryService.MemoryService] }, () =>
  Layer.succeed(MemoryService.MemoryService, FactStoreMemory.toMemory(operationStore)),
);
```

```ts
// AFTER
LayerSpec.make({ requires: [], provides: [FactStore], priority: 10 }, () => Layer.succeed(FactStore, operationStore));
LayerSpec.make({ requires: [], provides: [MemoryService.MemoryService], priority: 10 }, () =>
  Layer.succeed(MemoryService.MemoryService, FactStoreMemory.toMemory(operationStore)),
);
```

#### Operations registry

```ts
// BEFORE — plugin-routine/src/capabilities/layer-specs.ts
RegistrySpec:             affinity 'application', provides [Registry.Service]  // client.graph.registry
OperationsToRegistrySpec: affinity 'space', requires [Registry.Service, ...], provides [Registry.Service]
                          // re-registers every operation definition once per space
```

```ts
// AFTER
RegistrySpec: (requires[(ClientService, OperationHandlerProvider, Capability.Service, Plugin.Service)],
  provides[Registry.Service]);
// registers the operation definitions once, into client.graph.registry
// OperationsToRegistrySpec is deleted.
```

#### Traces

```ts
// BEFORE
FeedTraceSinkSpec: affinity 'space', requires [Database.Service], provides [FeedTraceSink.FeedTraceSink]
Capability.contribute(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver }));
// makeRoutingSink resolves FeedTraceSink with { space } per event.
```

```ts
// AFTER
// FeedTraceSink tag and FeedTraceSinkSpec are deleted.
Capability.contribute(Capabilities.TraceSink, ({ resolver }) => FeedTraceSink.makeRoutingSink({ resolver }));
// makeRoutingSink resolves Database.Service once and keeps a SpaceScoped<BufferedFeedWriter>,
// routing each event by its `space`.
```

#### Triggers

```ts
// BEFORE — packages/core/compute/compute/src/types/Trigger.ts
export interface State {
  readonly trigger: Trigger;
  // ...
}

export interface Manager {
  readonly triggers: Atom.Atom<readonly State[]>;       // this space's triggers
  readonly localDispatcherEnabled: boolean;
  readonly invokeTrigger: (options: InvokeOptions) => Effect.Effect<void, TriggerDisabledError>;
  readonly resetTrigger: (options: ResetOptions) => Effect.Effect<void, TriggerNotResettableError>;
}
export class ManagerService extends Context.Service<ManagerService, Manager>()('...') {}

// compute-runtime
TriggerDispatcher.layer({ timeControl }): Layer<TriggerDispatcher, never, Database.Service | TriggerStateStore | ProcessManagerService | AtomRegistry>
EdgeTriggerManager.fromClient(client, space): Layer<RemoteTriggerManager.Service>
// specs: TriggerDispatcherSpec, TriggerManagerSpec, RemoteTriggerManagerSpec — all affinity 'space'
```

```ts
// AFTER
export interface State {
  readonly space: SpaceId;                               // new
  readonly trigger: Trigger;
  // ...
}

export interface Manager {
  /** Triggers of every open space. */
  readonly triggers: Atom.Atom<readonly State[]>;
  /** Triggers of one space. */
  readonly triggersInSpace: (space: SpaceId) => Atom.Atom<readonly State[]>;
  readonly localDispatcherEnabled: boolean;
  // `InvokeOptions` and `ResetOptions` address a trigger by its URI, which carries its space.
  readonly invokeTrigger: (options: InvokeOptions) => Effect.Effect<void, TriggerDisabledError>;
  readonly resetTrigger: (options: ResetOptions) => Effect.Effect<void, TriggerNotResettableError>;
}

// compute-runtime
TriggerDispatcher.layer({ timeControl }): same requirements; watches `Database.Service.graph` for spaces
  opening and closing and keeps one SpaceScoped subscription per space. Spawned trigger processes carry
  `environment.space` of the trigger's space.
EdgeTriggerManager.fromClient(client): Layer<RemoteTriggerManager.Service>
```

#### Harness

```ts
// BEFORE — packages/core/compute/assistant/src/session/Harness.ts
export const layerSpec = LayerSpec.make(
  { affinity: 'process', requires: [Database.Service, ProcessManager.Service], provides: [HarnessService] },
  (context) => /* dies if !context.conversation */ make({ conversation: context.conversation, ... }),
);
export const make: (options: { conversation: URI.URI; processManager; runtime }) => Effect<Service, never, Scope>;
```

```ts
// AFTER
export const layerSpec = LayerSpec.make(
  { requires: [Database.Service, ProcessManager.Service], provides: [HarnessService] },
  () => layer,
);

/**
 * Members of `Service` are unchanged. Each reads `Process.conversation` and fails with
 * `NotSupportedError` outside a conversation, instead of the layer dying at build. The per-conversation
 * binder and chat are kept in a cache keyed by conversation URI, released when the last process for
 * that conversation exits.
 */
export const layer: Layer.Layer<HarnessService, never, Database.Service | ProcessManager.Service>;

/** The harness of an explicit conversation, for code outside the conversation's process. */
export const forConversation: (conversation: URI.URI) => Effect.Effect<Service, never, HarnessService>;
```

#### Shell

```ts
// BEFORE — plugin-claude/src/capabilities/shell-service.ts
LayerSpec.make({ affinity: 'process', requires: [], provides: [ShellService.ShellService] }, () => NodeShell.layer);
```

```ts
// AFTER
LayerSpec.make({ requires: [], provides: [ShellService.ShellService] }, () => NodeShell.layer);
// Children spawned by a process are tracked in a ProcessScoped set and killed when it exits — the
// cleanup the process slice's scope did before.
```

#### Process built-ins

These are not `LayerSpec`s today: `ProcessManager` adds them to each process's context.

```ts
// BEFORE — added per process by ProcessManager
Process.EnvironmentService; // { space, conversation }
Process.GuardService; // Guard
Cancellation.Service; // { signal }
StorageService.StorageService; // the process's key-value storage
Trace.TraceService; // stamped with pid, parentPid, space
Operation.Service; // child invocations parented to this pid
Process.ManagerService; // child spawns parented to this pid
```

```ts
// AFTER
Process.Current; // { pid, parentPid, environment, signal, guard } — replaces the first three
StorageService.StorageService; // one service; `get/set/list` act on `Process.pid`'s storage
Trace.TraceService; // one service; stamps pid, parentPid and space from `Process.Current`
Operation.Service; // one service; parents an invocation to `Process.pid` when present
Process.ManagerService; // one service; `spawn` parents to `Process.pid` when present

// Cancellation.Service is deleted; read `(yield* Process.current).signal`.
// Process.GuardService is deleted; read `(yield* Process.current).guard`.
// Process.EnvironmentService and Process.currentEnvironment are deleted; use `Process.environment`.
```

### EDGE

EDGE builds its layers per Durable Object, and a space DO hosts one space, so the change there is mostly
the constructor.

```ts
// BEFORE — edge/packages/services/operation-service/src/function-context/function-context.ts
const dbLayer = this.db ? Database.layer(this.db) : Database.notAvailable;
// plus Hypergraph.layer(graph) for the cross-space handle

// edge/packages/services/compute-service/src/processes/registry.ts
const { db } = yield * Database.Service;
AgentRouterNamespace.get().getByName(brain).serves(ctx, db.spaceId);
```

```ts
// AFTER
const dbLayer = this.graph
  ? Database.layer(this.graph)
  : this.db
    ? Database.layerSingle(this.db)
    : Database.notAvailable;

const space = yield * Process.space;
AgentRouterNamespace.get().getByName(brain).serves(ctx, space);
```

`compute-service`'s `operation-service-handler-set.ts` reads `Process.EnvironmentService` to forward the
environment to the operation worker; it reads `Process.environment` instead. The wire format of the
forwarded environment does not change.

## Migration

Each step lands on its own and keeps CI green.

1. **Add `Process.Current`** and set it in `ProcessManager` beside `EnvironmentService`. Add
   `Process.space`/`pid`/`environment`/`withSpace`, `SpaceScoped`, `ProcessScoped`. No behaviour change.
2. **Merge `Hypergraph.Service` into `Database.Service`.** The helpers resolve `current`; `Database.layer`
   takes a graph; tests move to `layerSingle(db)`. This is the large mechanical step (call sites that
   destructure `{ db }` change to `Database.current`; helper call sites do not change).
3. **Move each space and process spec to global**, one service per PR, in the order of the table
   (each depends only on services above it). Keep `affinity` accepted and ignored during this step.
4. **Delete `affinity`, `LayerContext`, `ResolutionContext`**, collapse `LayerStack` to one slice, add
   `priority`, delete `EnvironmentService`, `GuardService`, `Cancellation.Service`.
5. **EDGE**: bump the catalog and apply the EDGE changes above.

## Risks

- **Context lost across fibers.** A global service that forks a worker and reads `Process.Current` there
  sees no process. Mitigation: the rule above, plus a lint rule that flags `Process.current` inside
  `Effect.forkDaemon`/`forkIn` bodies.
- **`Promise` service methods.** Any method that returns a `Promise` cannot see the caller's fiber.
  `CredentialsService` is the known case; the audit in step 3 checks every service in the table.
- **Wrong space instead of a missing one.** Today a missing space fails at layer build. After, a fiber
  that inherited the wrong environment acts on the wrong space without failing. `requiresSpace` and the
  `withSpaceId` span annotation make this visible but do not prevent it.
- **Cache lifetimes.** Space slices were never released; `SpaceScoped` entries must release when a space
  closes, or memory grows with every space opened in a session.

## Open questions

1. Should the `Database.*` helpers **die** on a missing space (proposed, keeps 883 call sites unchanged)
   or **fail** with `NoSpaceError` in the error channel (type-safe, touches every call site)?
2. Should `Database.Service` and `Hypergraph.Service` merge (proposed), or should `Hypergraph.Service`
   stay as the cross-space tag and `Database.Service` become a thin current-space view over it?
3. `requiresSpace` on the operation definition, or infer it from `services` containing `Database.Service`
   (today's meaning, but wrong for operations that use only `graph`)?
4. `priority` on `LayerSpec`, or an explicit `overrides: Tag` field that fails when the overridden spec is
   absent?
