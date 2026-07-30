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

```ts
// 1. Inside a module body — declared, type-checked, ordering-aware.
const client = yield * ClientCapabilities.Client; // singleton → T
const templates = yield * ProjectCapabilities.Template; // multi → Contributions<T>

// 2. Outside a module (operations, callbacks, non-module code) — dynamic, string-keyed.
const handlers = yield * Capability.getAll(Capabilities.OperationHandler);
const maybe = yield * Capability.getOption(AppCapabilities.ProgressRegistry);
const atom = yield * Capability.atom(Capabilities.ReactSurface); // reactive
const later = yield * Capability.waitFor(ClientCapabilities.Client); // resolves when contributed

// 3. React.
const surfaces = useCapabilities(Capabilities.ReactSurface);
const client = useCapability(ClientCapabilities.Client);
```

> In graph-extension atom callbacks always use `Capability.atom`, never a synchronous
> `Capability.get` — a sync read inside an atom body caches a defect fallback with no reactive
> dependency.

---

## The four `contribut*` names

There is **no `Contributions` namespace**. There are four related names, and the overlap is the main
source of confusion:

| Name                                    | Kind     | What it is                                                                                                                                                                          |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Capability.contribute(tag, value)`     | function | Produces **one** `Contribution` for one value.                                                                                                                                      |
| `Capability.contributeAll(tag, values)` | function | Produces **one** `Contribution` carrying n values.                                                                                                                                  |
| `Contribution`                          | type     | What `activate` returns: `{ capability, values, deactivate? }`, branded by capability identity so the completeness check can verify it covers `provides`.                           |
| `Contributions<T>`                      | type     | The **live view** over everything contributed to a multi capability: `{ atom, get(), subscribe() }`. Obtained by `yield*`-ing a `MultiTag`, or via `Capability.contributions(tag)`. |

So `Contribution` is what you **produce**; `Contributions` is what you **read**.

### Why `Contributions` has to exist

A multi capability has no single value, and its membership changes over time as plugins are enabled
and disabled. So `yield*` on a `MultiTag` cannot hand you `T` — there isn't one — and must not hand
you a plain `T[]`, because that snapshot silently goes stale the moment another plugin contributes.
It hands you a live view instead:

```ts
const templates = yield* ProjectCapabilities.Template; // Contributions<Template>
templates.get(); // snapshot now
templates.subscribe((values) => ...); // notified on change
templates.atom; // for Atom-based composition
```

This is the framework's most common latent bug: taking a one-shot snapshot of a multi capability and
never seeing later contributions. `Contributions` exists to make the live/stale distinction explicit
at the type level rather than by convention.

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
