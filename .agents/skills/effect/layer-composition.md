# Layer Composition Style Guide

Conventions for composing Effect `Layer` stacks, primarily test environments. Reference example:
`packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts` (`TestLayer`).

## 1. One stack per environment — variations are options, not copies

Never maintain two near-identical layer stacks (e.g. a base `TestLayer` plus a copy that swaps one
service). Duplicated stacks drift silently and every environment change must be made twice.

Define a single parameterized factory whose options express every point of variation:

```ts
const TestLayer = (
  options: {
    timeControl?: 'natural' | 'manual';
    startingTime?: Date;
    spaceAwareResolver?: boolean;
  } = {},
) => Layer.empty.pipe(/* one stack */);
```

Callers state only their divergence: `TestLayer()`, `TestLayer({ timeControl: 'natural' })`,
`TestLayer({ spaceAwareResolver: true })`.

## 2. Compose as one linear `pipe` of `Layer.provideMerge`

Prefer a single flat pipeline over nested `Layer.mergeAll` groupings, and never mix the two idioms
in one expression:

```ts
// Avoid: nested merges piped into provides — two composition styles, unclear ordering.
Layer.mergeAll(
  StateStore.layerMemory,
  Layer.mergeAll(AiService.notAvailable, FetchHttpClient.layer),
).pipe(Layer.provideMerge(ProcessManager.layer(...)));
```

```ts
// Prefer: one flat stack. Consumers at the top, deepest infrastructure at the bottom.
Layer.empty.pipe(
  Layer.provideMerge(Dispatcher.layer(options)),
  Layer.provide(StateStore.layerMemory),
  Layer.provideMerge(ProcessManager.layer(...)),
  Layer.provideMerge(TestDatabaseLayer({ types: [...] })),
  Layer.provideMerge(Trace.layerNoop),
);
```

Each later `provideMerge` feeds everything above it, so the stack reads top-down as a dependency
graph and documents the wiring order.

## 3. Start from `Layer.empty`

Use `Layer.empty` as the neutral root so every real layer enters the stack uniformly as a step in
the pipe. Without it, the first layer is special-cased as the pipe head and cannot be reordered or
removed like the others. `Layer.empty` is the identity — it costs nothing.

## 4. Alternatives are a ternary in one slot

When an option selects between two implementations of the same service, branch inside that slot —
never fork the whole stack:

```ts
Layer.provideMerge(
  options.spaceAwareResolver ? SpaceAwareResolverLayer : ServiceResolver.layerRequirements(Database.Service),
),
```

Both branches must provide the same tag so the rest of the stack is oblivious to the choice.

## 5. `Layer.provide` for private dependencies, `provideMerge` for shared ones

- `Layer.provideMerge(dep)` — satisfies the layers above **and** exposes the service in the final
  environment (test bodies can `yield*` it).
- `Layer.provide(dep)` — satisfies the layers above but hides the service from the output.

Use plain `provide` for internal details consumers should not reach into (e.g. a dispatcher's
private state store). Defaulting everything to `provideMerge` leaks internals into the environment
type and invites tests to couple to them.

## 6. Options bag: all-optional, defaults applied at the point of use

Make every field optional, default the parameter to `{}`, and resolve defaults inline with `??`
where the value is consumed:

```ts
Dispatcher.layer({
  timeControl: options.timeControl ?? 'manual',
  startingTime: options.startingTime ?? new Date('2025-09-05T15:01:00.000Z'),
}),
```

Do not encode defaults in the parameter default (`= { timeControl: 'manual', ... }`): they vanish
the moment a caller passes any object at all — `TestLayer({ spaceAwareResolver: true })` would
silently drop the `startingTime` default. Pick defaults matching the majority of call sites.

## 7. Hoist shared fixtures to module scope; extend, don't swap

Fixtures used by an environment variant (probe operations, alternative resolvers) live at module
scope so the single factory can reference them. Merge variant-specific additions into the common
set rather than substituting a different set per variant:

```ts
OperationHandlerSet.provide(OperationHandlerSet.merge(ExampleHandlers, OperationHandlerSet.make(ProbeHandler))),
```

One superset environment serving all tests is simpler than per-test environments, as long as the
additions are inert for tests that do not use them.
