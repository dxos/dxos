# Operation handler maps in `dx.config.ts` (spike)

## Problem

A plugin's operations were known only after its operation-handler module loaded. `dx.config.ts`
named a hand-written module (`src/capabilities/operation-handler.ts`), and that module contributed an
`OperationHandlerSet.lazy([...])` built in `src/operations/<Plugin>OperationHandlerSet.ts`. So the
build could not list what a plugin provides, and every plugin carried two files of boilerplate.

## Proposal

The config holds the map literally:

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

It uses `lazy`, not `make`. `make` takes handlers that are already loaded, so the config would
import every handler body.

### The manifest records a map, not a module

The build evaluates the config headless. There, each `module-url` import returns a marker, so the
build reads each operation's key and handler location without loading the handler. The manifest
entry has no body URL. It carries a plain JSON map from operation key to handler module URL:

```json
{
  "id": "OperationHandler",
  "activatesOn": { "id": "dxn:org.dxos.app-framework.event.idle" },
  "requires": [],
  "provides": [{ "identifier": "org.dxos.app-framework.capability.operationHandler", "arity": "multi" }],
  "operations": {
    "dxn:org.dxos.operation.file.create": "/assets/create-C1b2.js",
    "dxn:org.dxos.operation.file.read": "/assets/read-D3e4.js"
  }
}
```

Each URL is the handler's own chunk in a build, its source URL when served, and its specifier in a
library build. The map is plain data, so it moves unchanged when manifests become JSON files.

An earlier version of this spike generated a module body from the map. That module imported every
definition statically, so a plugin's library entry imported them eagerly. The map removes the
module, and the plugin entry now imports nothing but the framework.

### The runtime builds the set from the map

`Plugin.fromManifest` turns an operations entry into a module that contributes
`OperationHandlerSet.fromLoaders(map)`. Nothing loads until an operation is invoked. Then the set
imports that handler's URL and checks that the module's default export is a handler for that key.
The loaded handler supplies the real definition and handler.

### What needs definitions before a handler loads

A set built from the map knows only keys until a handler loads, so `definitions()` is replaced by
`descriptors()`. It returns `{ key, definition? }`: the definition is present when the set holds it
in memory (an authored set, or a handler that has loaded).

| Reader                                                               | Needs                                | Now                                                                |
| -------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Invoker input validation                                             | the schema, at invoke time           | The definition from the loaded handler.                            |
| `plugin-assistant` `useAttachFile`, `plugin-tasks` `TaskAttachments` | whether a key exists                 | `descriptors()` keys.                                              |
| `plugin-doctor` skills diagnostics                                   | keys usable as tool ids              | `descriptors()` keys.                                              |
| `plugin-debug` CLI `ops`                                             | keys                                 | `descriptors()` keys.                                              |
| `plugin-debug` CLI `invoke`, devtools `composer.invoke`              | the definition                       | `findDefinition`, which loads one handler.                         |
| devtools `composer.operations()`                                     | key, name, fields                    | Descriptors; name and fields once loaded.                          |
| `plugin-routine` `registry-sync` and `layer-specs`                   | full records (`Operation.serialize`) | `loadDefinitions`, which loads the handlers the set does not hold. |

The last row is what #14332's registry descriptors are for. Each descriptor is the item's
`PersistentOperation` JSON, which is exactly what `registry-sync` and `layer-specs` build at
runtime. Descriptors join the map by operation key. MCP `queryOperations`, tool listing and the
registry UI then read data and never load a handler. This option was chosen because both spikes
then share one key space:

- Loading the definitions module on first listing keeps the eager import this design removes.
- Listing only keys breaks tool listing.

**Until #14332 lands**, a converted plugin built from a manifest loads its handlers when
`layer-specs` builds the operation registry and when `registry-sync` runs at idle. Tests, stories and
authored configs hold their definitions in memory and load nothing. So this change should not
merge before #14332.

### Hosts without a plugin manager

The CLI, tests and stories invoke operations directly, so a plugin still exposes `operations`.
`Plugin.config` gives the authored set. A library entry gives the set built from the map, which is
lazy and imports nothing until an operation is invoked.

### Drift check

It is gone. The map is the only declaration.

## Spike scope

Three plugins are converted:

- `plugin-file`: 5 operations, Idle.
- `plugin-markdown`: 14 operations, Startup, three of them defined in `@dxos/app-toolkit`.
- `plugin-chess`: 4 operations, Idle.

Each loses `src/capabilities/operation-handler.ts`, `src/operations/index.ts`, the
`<Plugin>OperationHandlerSet` module and its public subpath.

## Migration

74 `dx.config.ts` files use `AppCapability.operationHandler`. 3 are converted here, and 71 remain.
Each remaining plugin needs these changes:

1. Move its `lazy([...])` entries into the config, with `./src/operations/` paths and the
   `module-url` attribute.
2. Delete the three files.
3. Repoint outside users of its handler set to `operations`.

A codemod can do this. Sets built with `make` or `keyed` must become `lazy` first.

## Open questions

1. #14332 descriptor join: reference descriptors from the map per key, or keep the two indexes
   separate and join by key at runtime? This spike assumes the latter.
2. Should `operationHandler(loader)` be removed once every plugin is converted?
3. Should EDGE (`workerd`) route by the manifest's keys instead of activating every plugin?
