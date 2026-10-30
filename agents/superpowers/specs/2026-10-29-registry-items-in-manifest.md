# Registry items in the plugin manifest (spike)

Follows [operations in `dx.config.ts`](./2026-10-29-operations-in-config.md) (dxos/dxos#14330) and
generalizes it from operations to every registry item a plugin contributes: types, operations and
skills today, then space templates and MCP servers.

## Recommendation

**Option b: the manifest carries a thin inline index, and each entry links to one content-addressed
JSON file.** JS module links (option c) stay what they are today: the way to load _code_ — handlers
and surfaces — never the way to _describe_ an item.

The spike's evidence supports this and sharpens it in two places:

1. The descriptor format already exists. The registry (`@dxos/echo-client` `makeRegistry`) is a set of
   ECHO entities keyed by URI. An operation already serializes to a `PersistentOperation` object
   (`Operation.serializable`), a skill is already a `Skill` object, and a type already serializes to
   JSON Schema (which is how stored schemas persist). The per-item file is that ECHO JSON, so a host
   rehydrates it with `Obj.fromJSON` and adds it to its registry. No new format is invented.
2. The JSON is a description, not the source of truth. It is good enough to list, search, route and
   hand to a model. It is not always good enough to validate (see the round-trip findings). Runtime JS
   keeps importing the definition (`FileOperation.Create`); the descriptor never replaces it.

## Options

|                    | a) inline                                                                                                                          | b) index + JSON files                      | c) index + JS modules                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Manifest size      | Every descriptor at boot. For plugin-file, 14 KB for 8 items; roughly 1 MB if 90 plugins were similar (extrapolated, not measured) | About 1.3 KB per plugin                    | Same as b                             |
| Lazy               | No                                                                                                                                 | Yes: fetch one item on demand              | Yes                                   |
| Fidelity           | JSON (lossy where noted below)                                                                                                     | JSON (same)                                | Full: the live definition             |
| Needs code to read | No                                                                                                                                 | No                                         | Yes: must evaluate plugin code        |
| Caching            | Busts with any change to the plugin                                                                                                | Immutable per item (hash in the file name) | Per chunk, but the chunk carries code |
| Third-party safe   | Yes                                                                                                                                | Yes: a reader parses data                  | No: reading runs untrusted code       |

Option c fails the main requirement: the registry UI, EDGE routing and MCP discovery must read a
third-party plugin's items without running its code. Option a fails on size: the app boots every
plugin's metadata, and the descriptors are ten times larger than the index.

## Shapes

The index rides on `Plugin.Manifest` (and could ride on the registry's `PluginRelease`, which already
carries a `manifestHash`):

```ts
type Manifest = Config2.Config & {
  modules: readonly ManifestModule[];
  registry?: readonly ManifestRegistryEntry[];
};

type ManifestRegistryEntry = {
  uri: string; // dxn:org.dxos.operation.file.read, org.dxos.skill.file, the type's URI
  kind: string; // 'type' | 'operation' | 'skill'
  name?: string;
  hash: string; // SHA-256 prefix of the descriptor
  url: string; // ./registry/<hash>.json in a library; the bundler's asset URL in an app
};
```

The descriptor file, built by `@dxos/app-toolkit/RegistryDescriptor`:

```ts
type Descriptor =
  | { kind: 'type'; uri: string; typename: string; version: string; jsonSchema: JsonSchema; lossy: string[] }
  | { kind: 'operation'; uri: string; objects: [PersistentOperationJson]; opaqueInputs: string[] }
  | { kind: 'skill'; uri: string; objects: [SkillJson, TextJson] };
```

`objects` lists ECHO JSON, root first, followed by the objects the root owns through refs. A skill
needs this: its instructions are a `Ref` to a separate `Text` object. Object ids are derived from the
item's URI (see finding 5), so a file's hash changes only when its content does.

`lossy` and `opaqueInputs` tell a reader which parts it can describe but not validate. `lossy` lists the
JSON paths that change when the schema is decoded from the file and encoded again; a one-member `anyOf`
is treated as its member, because decoding re-wraps tag literals that way without changing their
meaning.

## How the build emits it

`pluginConfigPlugin({ registry: { describer } })` turns it on; `defineConfig({ registry: true })` passes
`@dxos/app-toolkit/RegistryDescriptor` as the describer. The three example plugins set it.

For each config, the build:

1. picks the modules that provide a capability the describer lists in `identifiers` (schema, skill
   definition, operation handler);
2. imports only those bodies, in the evaluator that already runs `dx.config.ts`, so the bodies and the
   describer share one copy of each package. UI bodies are never loaded;
3. calls `fromModules`, which activates each body (the data array for schemas, the module function for
   the others) and reads the contributions;
4. emits each descriptor as an asset and writes `registry` into the manifest.

A module whose body cannot load or activate headless is reported as a build warning, not a failure, so
turning this on cannot break a plugin's build. An operation that `Operation.serializable` drops is
reported the same way.

The describer lives in app-toolkit because it needs ECHO and compute, which app-framework must not
depend on. app-framework only knows the describer's shape (`identifiers`, `fromModules`).

## How it joins #14330

#14330 is being reworked so the operation-to-handler map is written in `dx.config.ts`:
`AppCapability.operationHandler(OperationHandlerSet.lazy([...]))`. This spike does not add a second
declaration of operations. It reads them from the contributed `OperationHandlerSet`'s `definitions()`,
which lists the definitions without loading any handler. That works the same whether the set comes from
a module body (today) or from the config itself (the rework): an inline module is its own body function,
so the build hands it to the describer directly. A test covers the inline form.

So once #14330 lands, the manifest's `registry` entries of kind `operation` are the first-class list
#14330 names as its next step, and the keys in `adapter.args` are no longer needed for discovery.

## Findings

Run as `registry-items.test.ts` in plugin-file (7 tests), plugin-markdown (1) and plugin-kanban (1).
The three plugins were picked for different shapes:

| Plugin   | Types | Operations | Skills | Shape exercised                                                            |
| -------- | ----- | ---------- | ------ | -------------------------------------------------------------------------- |
| file     | 2     | 5          | 1      | bytes transform (`Blob`), browser `File` input                             |
| markdown | 2     | 14         | 1      | many operations, `Text`-backed type, operations defined in another package |
| kanban   | 1     | 4          | 1      | tagged union of `{ kind, Ref<View> }` and `{ kind, Ref[] }`, ref inputs    |

1. **Object types with refs and unions are lossless.** `File.File` (a `Ref<Blob>`), `Markdown.Document`,
   `Text.Text` and `Kanban.Kanban` (a tagged union of structs holding refs) all round-trip.
2. **Transforms are lossy.** `Blob.Blob` loses `contentEncoding: base64` on its bytes field, so the
   decoded schema treats bytes as a plain string. It is the only loss in the three plugins, and the
   descriptor now lists it in `lossy`.
3. **Untyped operation inputs are blanked, not dropped.** `Operation.serializable` drops nothing in
   these plugins. Inputs it cannot describe serialize as `{}`, which accepts anything:
   `FileOperation.Create`'s `file` and `db` (a browser `File` and a database handle),
   `KanbanOperation.DeleteCard`'s `card`, and `subject` in the three `CollaborationOperation`s. The
   descriptor lists them in `opaqueInputs`. (The comment on `CreateFromSource` says such an operation is
   "dropped from the registry silently"; that is no longer true.)
4. **A plugin can implement operations it does not define.** markdown's handler set implements
   `appToolkit.acceptChange`, `rejectChange` and `restoreText`, defined in app-toolkit. Their
   descriptors land in markdown's index. If another plugin implements them too, two manifests list the
   same URI. See open question 5.
5. **Random object ids break content addressing.** `Obj.make` mints a new id for every operation record
   and skill, so the same item hashed differently on each evaluation. A library build has one entry per
   runtime, and each wrote its own copy: 20 files for plugin-file's 8 items. The describer now derives
   each id, and every ref to it, from the item's URI. Two runs produce identical files, and a library
   build writes one file per item.
6. **Descriptors rehydrate.** `Obj.fromJSON` turns an operation descriptor back into a
   `PersistentOperation` with its registry key, with no resolver.
7. **Skills need their owned objects.** The prompt lives in a `Text` object behind a `Ref`; the
   descriptor ships both.

Sizes from the built plugins (index measured in tests, files on disk):

| Plugin   | Index  | Descriptors |
| -------- | ------ | ----------- |
| file     | 1.3 KB | 14.4 KB     |
| markdown | 2.9 KB | 25.7 KB     |
| kanban   | 1.0 KB | 7.0 KB      |

## What the spike adds

- `@dxos/app-toolkit/RegistryDescriptor`: `describe(items)` and `fromModules(modules)`, which return the
  index, the descriptor files and the modules or operations it could not describe.
- `pluginConfigPlugin`'s `registry` option, and `defineConfig({ registry: true })` in
  `vite.base.config.ts`. `Plugin.Manifest` gains an optional `registry` field. Nothing reads it yet.
- `registry: true` in the vite configs of plugin-file, plugin-markdown and plugin-kanban.
- `registry-items.test.ts` in each of the three plugins.

## Migration

- 65 configs use `AppCapability.schema`, 41 use `skillDefinition`, 74 use `operationHandler`.
- No config changes: the build reads existing module bodies. Turning it on everywhere is setting
  `registry: true` by default and fixing the warnings it reports.
- Operations need no extra declaration, now or after #14330.

## Open questions

1. Should the JSON Schema encoder keep `contentEncoding` on decode, removing the only loss found, or is
   the `lossy` flag enough?
2. Does a skill descriptor embed the descriptors of its tools' operations, or list their URIs? The spike
   lists URIs: the operations are separate index entries.
3. Who reads the descriptors first: the plugin-registry UI, EDGE's operation routing, or MCP
   `queryOperations` for a plugin that is not activated?
4. Should `PluginRelease` in `@dxos/protocols` carry the index, so the registry can list a plugin's
   items without fetching its manifest?
5. Which plugin owns a descriptor for an operation defined in one package and implemented in another
   (finding 4)? The defining package, the implementing plugin, or both, with the registry merging on URI?
6. The build activates schema, skill and handler module bodies in node. That is fine for first-party
   plugins at build time. Is it fine for a third-party plugin built by `dx registry publish`?

## Verification

- `moon run plugin-file:build plugin-markdown:build plugin-kanban:build` succeeded with no registry
  warnings. Each library build wrote one descriptor per item: 8, 17 and 6 files.
- A local script read the `registry` block of all nine built entries (default, node and workerd for
  each plugin) and checked that every URL names an emitted file whose SHA-256 prefix, `uri` and `kind`
  match the entry: 93 of 93 matched. The script is not committed and is not a CI check.
- The `registry-items.test.ts` suites pass: 7, 1 and 1 tests.
- Not verified: an app build (as opposed to a library build), where the URL comes from the bundler's
  asset URL instead of a relative path. Nothing reads `registry` yet.
