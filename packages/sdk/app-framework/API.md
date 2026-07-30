# DXOS App Framework API

Companion to [ARCHITECTURE.md](./ARCHITECTURE.md), which covers how the pieces relate. This is the
API surface.

## Imports

```ts
import {
  ActivationEvent, // Runtime activation events (make/oneOf/allOf)
  ActivationEvents, // Well-known framework events (Startup, ...)
  Capabilities, // Well-known capability tags (ReactSurface, OperationHandler, ...)
  Capability, // Capability tags, contributions, module authoring
  Plugin, // Plugin definition + builder
  PluginManager, // Manager type (usually obtained, not constructed)
} from '@dxos/app-framework';
import { Surface, useApp, useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { withPluginManager } from '@dxos/app-framework/testing';
```

---

## Defining a capability

A capability is a typed, NSID-keyed slot. **Arity is chosen at definition** and decides what
consumers get.

```ts
// Multi (the default): an open registry many modules contribute to.
export const Template = Capability.make<Template>()('org.dxos.plugin.projects.capability.template');

// Singleton: exactly one provider.
export const Client = Capability.makeSingleton<ClientApi>()('org.dxos.plugin.client.capability.client');
```

Both are curried — `make<T>()(nsid)` — so the NSID string literal is captured and brands the
identifier. NSIDs must be camelCase (`DXN.Name`). The single-call form `make<T>(nsid)` still compiles
but widens the NSID to `string`, making the compile-time check vacuous; prefer the curried form.

|                    | `makeSingleton` → `Tag<T>`           | `make` → `MultiTag<T>`                    |
| ------------------ | ------------------------------------ | ----------------------------------------- |
| `yield* tag` gives | `T`                                  | `Contributions<T>` (live view)            |
| Requiring it       | gates activation on its one provider | never gates — the collection may be empty |
| Two providers      | `DuplicateProviderError`             | normal                                    |

---

## Authoring a module

A module is a body plus a declaration of what it `requires` and `provides`.

```ts
// Code-split (the common case) — the chunk loads when the module activates.
export const Coordinator = Capability.lazyModule(
  'ConnectorCoordinator',
  { requires: [ClientCapabilities.Client], provides: [ConnectorCoordinator] },
  () => import('./connector-coordinator'),
);

// Eager — body defined inline, no separate chunk.
export const Extractor = Capability.inlineModule(
  'SummarizeExtractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () => Effect.succeed(Capability.contribute(InboxCapabilities.ObjectExtractor, extractor)),
);
```

The body is written with `Capability.makeModule` and yields its declared requirements:

```ts
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client; // declared in `requires`
    const coordinator = new Coordinator(client);
    return Capability.contribute(ConnectorCoordinator, coordinator);
  }),
);
```

Yielding a tag that is not in `requires` is a type error (it escapes the `R` channel); failing to
contribute a declared `provides` is also a type error.

**Makers.** Capability owners export a maker so call sites don't repeat `provides`.
`@dxos/app-toolkit` ships them for the common capabilities:

```ts
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [SomeCapabilities.Thing],
});
```

Build your own with `Capability.moduleMaker(name, tag)`.

---

## Composing a plugin

```ts
export const FooPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Coordinator),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(AppCapability.schema([Foo.Foo])),
  Plugin.make,
);
```

`Plugin.define(meta)` starts a builder; each `addModule` adds one module; `Plugin.make` seals it.
When the plugin takes options, `addModule` also accepts `(options) => module` and makers accept a
`props` mapping from plugin options to body props. If every option is optional, calling
`FooPlugin()` with no argument is allowed.

---

## Consuming capabilities

Three access paths, for three situations.

**1. Inside a module body** — declared, type-checked, ordering-aware.

```ts
Effect.fnUntraced(function* () {
  const client = yield* ClientCapabilities.Client; // singleton → T
  const templates = yield* ProjectCapabilities.Template; // multi → Contributions<T>
});
```

**2. Outside a module** (operations, callbacks, non-module code) — dynamic, string-keyed.

```ts
Effect.gen(function* () {
  const handlers = yield* Capability.getAll(Capabilities.OperationHandler);
  const maybe = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
  const surfaces = yield* Capability.atom(Capabilities.ReactSurface); // reactive
  const client = yield* Capability.waitFor(ClientCapabilities.Client); // resolves when contributed
});
```

**3. React.**

```tsx
const surfaces = useCapabilities(Capabilities.ReactSurface);
const client = useCapability(ClientCapabilities.Client);
```

> In graph-extension atom callbacks always use `Capability.atom`, never a synchronous
> `Capability.get` — a sync read inside an atom body caches a defect fallback with no reactive
> dependency.

---

## Contributing values

A module returns its contributions from `activate`. `contribute` carries one value, `contributeAll`
carries several for the same capability; both produce a single `Contribution`.

```ts
return [
  Capability.contribute(Capabilities.ReactSurface, surface),
  Capability.contributeAll(Capabilities.LayerSpec, [clientSpec, databaseSpec]),
];
```

A module providing exactly one capability may return the `Contribution` directly, without the array.
An optional third argument is a `deactivate` hook, run once when the module is deactivated.

The return is checked against the module's declared `provides`: omitting a declared capability is a
type error, and contributing an undeclared one fails at runtime.

## Reading a multi capability

A multi capability has no single value, and its membership changes as plugins are enabled and
disabled. Reading one therefore gives a live `Contributions<T>` view rather than an array:

```ts
Effect.fnUntraced(function* () {
  const templates = yield* ProjectCapabilities.Template; // Contributions<Template>

  templates.get(); // readonly Template[] — snapshot as of now
  templates.subscribe((values) => setTemplates(values)); // → unsubscribe
  templates.atom; // Atom<Template[]> for Atom-based composition
});
```

`get()` is a point-in-time snapshot: hold onto it and it will not reflect capabilities contributed
later. Consume the collection reactively — via `subscribe`, `atom`, or the React hooks — unless the
value is used immediately and discarded.

### `Contribution` vs `Contributions`

Two types one letter apart, on either side of the registry:

|             | `Contribution`                            | `Contributions<T>`                                           |
| ----------- | ----------------------------------------- | ------------------------------------------------------------ |
| Direction   | what a module **produces**                | what a consumer **reads**                                    |
| Produced by | `Capability.contribute` / `contributeAll` | `yield*` on a `MultiTag`, or `Capability.contributions(tag)` |
| Shape       | `{ capability, values, deactivate? }`     | `{ atom, get(), subscribe() }`                               |
| Scope       | one module's values for one capability    | every module's values for one capability                     |

---

## Activation

A module activates in one of two modes, normalized onto `PluginModule.activation`:

- **Dependency mode** (the default) — declared `requires`/`provides`. The manager topologically
  orders modules so providers run before consumers. A module with no `requires` is a startup root.
- **Event mode** — `activatesOn` a genuine runtime event; `requires` are pulled on demand when it
  fires.

```ts
Capability.lazyModule(
  'OnSpaceCreated',
  { activatesOn: SpaceEvents.SpaceCreated, provides: [] },
  () => import('./on-space-created'),
);
```

Surviving events are runtime occurrences only — `ActivationEvents.Startup`, `SpacesReady`,
`SpaceCreated`, `IdentityCreated`, `TypeAdded`, plus parameterized `createStateEvent` /
`createSettingsEvent`. Ordering-only `Setup*`/`*Ready` events were removed; express ordering as
`requires`/`provides`.

Structural problems isolate rather than abort startup: a dependency cycle, duplicate singleton
provider, or unsatisfiable requirement puts the owning plugin in an error state
(`DependencyCycleError`, `DuplicateProviderError`, `MissingProviderError`,
`ProvidesMismatchError`) and everything else proceeds.

---

## Well-known capabilities

`Capabilities` (framework) — `ReactSurface`, `ReactContext`, `ReactRoot`, `OperationHandler`,
`OperationInvoker`, `UndoMapping`, `Command`, `Layer`, `LayerSpec`, `TraceSink`, `AtomRegistry`,
`ServiceResolver`, `ProcessManagerRuntime`, `ProcessMonitor`, `PluginManager`.

`AppCapabilities` (`@dxos/app-toolkit`) — `Translations`, `Schema`, `Settings`, `AppGraph`,
`AppGraphBuilder`, `SkillDefinition`, `PluginAsset`, `Toolkit`, `NavigationTargetResolver`,
`NavigationHandler`, `TextContent`, `CommentConfig`, `AnchorSort`, `AnchorResolver`, `Layout`.

---

## Testing

```ts
withPluginManager({
  plugins: [ClientPlugin(), FooPlugin()],
  capabilities: [Capability.contribute(SomeCapability, stub)], // takes Contribution[]
});
```

`@dxos/app-framework/testing` also exports `harness` (headless activation assertions) and
`createComposerTestApp`.

---

## Type reference

| Type                          | Meaning                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `Capability.Tag<T, S>`        | Singleton tag; `yield*` → `T`                                  |
| `Capability.MultiTag<T, S>`   | Multi tag; `yield*` → `Contributions<T>`                       |
| `Capability.AnyTag`           | `Tag \| MultiTag`                                              |
| `Capability.Contribution`     | One branded contribution (capability + n values)               |
| `Capability.Contributions<T>` | Live view: `{ atom, get(), subscribe() }`                      |
| `Capability.Any`              | A registry entry: `{ interface, implementation, deactivate? }` |
| `Capability.Module<Options>`  | An authored module, opaque except for its options type         |
| `Plugin.Plugin`               | `{ meta, modules }`                                            |
| `Plugin.PluginModule`         | `{ id, activation, activate() }`                               |
| `Plugin.ActivationSpec`       | `dependency \| event` discriminated union                      |

`Contribution` → `Capability.Any` is a 1-to-n expansion performed by the manager
(`expandContributions`); see [ARCHITECTURE.md](./ARCHITECTURE.md#the-two-layer-split).
