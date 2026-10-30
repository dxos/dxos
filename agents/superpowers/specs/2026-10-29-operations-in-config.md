# Operation handler maps in `dx.config.ts` (spike)

## Problem

A plugin's operations were known only after its operation-handler module loaded. `dx.config.ts`
named a hand-written module (`src/capabilities/operation-handler.ts`), and that module contributed an
`OperationHandlerSet.lazy([...])` built in `src/operations/<Plugin>OperationHandlerSet.ts`. So the
build could not list what a plugin provides, and every plugin carried two files of boilerplate.

The config is evaluated at build time in a Vite runnable environment and turned into a JSON
manifest. Whatever it imports must load headless, so it can hold operation definitions but not
handler bodies.

## Proposal

The config holds the map itself:

```ts
AppCapability.operationHandler(
  OperationHandlerSet.lazy([
    FileOperation.Create.pipe(
      Operation.lazyHandler(() => import('./src/operations/create.ts', { with: { type: 'module-url' } })),
    ),
    // ...
  ]),
  { activatesOn: ActivationEvents.Idle },
);
```

It is `OperationHandlerSet.lazy`, not `.make`. `.make` takes handlers that are already loaded, so the
config would import every handler body. The `module-url` attribute keeps each handler out of the
config graph, as it does for module bodies.

### How the build records it

1. `operationHandler(set)` returns an inline module tagged with the set
   (`Capability.OperationsTag`). The set keeps its pairings (`OperationHandlerSet.getLazyEntries`).
2. When the build evaluates the config, each handler loader returns a marker with its specifier,
   as module bodies do. The build resolves each specifier to a file.
3. The build finds each definition by identity: it searches the modules the evaluation loaded for
   the one that exports that object by name. A module in the plugin's own package is imported by
   file. A module in another package is imported through the package subpath whose `source` is that
   file. Markdown's `CollaborationOperation.*` from `@dxos/app-toolkit` is an example of this.
4. From these, the build generates the module body
   (`\0dx-operations:<module>:<config path>`): static imports of the definitions, and one dynamic
   import per handler. The bundler then makes each handler its own chunk.
5. The manifest entry for the module gets `operations: [key, ...]`. This is the build-time list of
   what the plugin provides. Its `url` points at the generated body.

### How the runtime gets the set back

No runtime change is needed. The manifest loads the generated body like any other module body.
Activation imports only the definitions (they are small), and each handler loads on its first
invocation through `OperationHandlerSet.lazy`.

Hosts that have no plugin manager read the set from the plugin. Examples are the CLI, node tests
and stories. `Plugin.config` exposes `operations` (all operations modules merged), and so does a
library build's plugin entry. These hosts used `@dxos/plugin-*/<Plugin>OperationHandlerSet`
before. They now import `operations` from the plugin's `#meta` / `./<Plugin>Plugin` export.

### Drift check

It is deleted, together with `OperationHandlerAdapter`. The map is the only declaration, so there
is nothing for it to drift from.

### Activation on first invoke

This is not done. The registry needs full definitions (schemas) to list tools and validate input
before a handler loads. Activating the module now costs only the definitions, so Idle/Startup
stays as authored. A real `OperationInvoked(key)` event would need the invoker to wait on module
activation. It is a separate change, and the manifest's key list makes it possible.

## Spike scope

Three plugins are converted:

- `plugin-file`: 5 operations, Idle.
- `plugin-markdown`: 14 operations, Startup. Definitions come from two packages, and other
  packages' tests and stories use its set.
- `plugin-chess`: 4 operations, Idle. The CLI uses its set.

Each loses `src/capabilities/operation-handler.ts`, `src/operations/index.ts`, the
`<Plugin>OperationHandlerSet` file, its `#operations` import and its public subpath.

## Migration

74 `dx.config.ts` files use `AppCapability.operationHandler`. 3 are converted here, and 71 remain.
Each remaining plugin needs the following changes:

1. Move its `lazy([...])` entries into the config.
2. Prefix each handler path with `./src/operations/` and add the `module-url` attribute.
3. Delete the three files.
4. Repoint any outside consumer of its handler set to `operations`.

A codemod can do this, because every entry has the form `Def.pipe(Operation.lazyHandler(...))`.
Sets built with `OperationHandlerSet.make` or `keyed` must become `lazy` first. When none remain,
`operationHandler(loader)` can be removed.

## Open questions

1. The `operations` export needs a name. Today it is a plain set on the config. Another option is
   a `Plugin.getOperations(config)` accessor that reads either shape.
2. Should definitions modules be checked to stay import-light? The config, and now the generated
   body, imports them statically.
3. Should the manifest carry name and description next to each key, for a plugin catalog?
4. Should EDGE (`workerd`) route by the manifest's key list instead of activating every plugin?

## Verification

See the PR. Builds and tests were run locally for the framework packages, the three plugins and
their outside consumers. The app-build path (`emitFile` of the generated body) and the dev-server
path (`/@id/` URL) have not been exercised by any test yet.
