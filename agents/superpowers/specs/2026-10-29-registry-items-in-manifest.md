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

The index rides on `Plugin.Manifest` (and on the registry's `PluginRelease`, which already carries a
`manifestHash`):

```ts
type Manifest = Config2.Config & {
  modules: readonly ManifestModule[];
  registry?: readonly RegistryIndexEntry[];
};

type RegistryIndexEntry = {
  uri: string; // dxn:org.dxos.operation.file.read, dxn:org.dxos.skill.file, the type's URI
  kind: 'type' | 'operation' | 'skill';
  name?: string;
  hash: string; // content hash of the descriptor
  path: string; // registry/<hash>.json, relative to the manifest
};
```

The descriptor file, implemented in `@dxos/app-toolkit/RegistryDescriptor`:

```ts
type Descriptor =
  | { kind: 'type'; uri: string; typename: string; version: string; jsonSchema: JsonSchema }
  | { kind: 'operation'; uri: string; objects: [PersistentOperationJson]; opaqueInputs: string[] }
  | { kind: 'skill'; uri: string; objects: [SkillJson, TextJson] };
```

`objects` lists ECHO JSON, root first, followed by the objects the root owns through refs. A skill
needs this: its instructions are a `Ref` to a separate `Text` object, so the `Skill` object alone does
not contain the prompt.

## How it joins PR 2

PR 2 makes the config declare which operations a handler module implements, so the build knows the
keys. This spike is the next step: the build also emits each declared operation's descriptor and lists
it in `registry`. That replaces PR 2's "keys in `adapter.args`" with the first-class field PR 2 lists
as its next step. Types and skills follow the same path. The build already loads the schema and skill
module bodies' imports headlessly (they are data, and plugin-file's ran in node in this spike), so it
can evaluate them and emit their descriptors without any change to `dx.config.ts`.

## Round-trip findings

Run as `packages/plugins/plugin-file/src/registry-items.test.ts` (5 tests, passing):

1. **Plain object types are lossless.** `File.File` encodes to JSON Schema, decodes, and re-encodes
   identically, typename, version and the `Ref<Blob>` field included.
2. **Transforms are lossy.** `Blob.Blob` stores bytes as `Uint8Array`, which encode as a base64 string
   with `contentEncoding: base64`. After decoding, the schema forgets the encoding and treats the field
   as a plain string. A tagged union's literal also changes shape (`enum` becomes `anyOf`); that is
   equivalent, not lossy.
3. **Non-JSON operation inputs are not dropped, they are blanked.** `FileOperation.Create` takes a live
   browser `File`. `Operation.serializable` keeps it and describes `file` and `db` as `{}`, which
   accepts anything. The descriptor flags such fields as `opaqueInputs`, so a reader knows it cannot
   validate them. (The comment on `CreateFromSource` says such an operation is "dropped from the
   registry silently"; that is no longer true and is worth correcting separately.)
4. **Skills need their owned objects.** The skill's prompt lives in a `Text` object behind a `Ref`;
   the descriptor ships both.

Sizes for plugin-file (2 types, 5 operations, 1 skill): the index is 1.3 KB, the descriptors 14 KB.

## What the spike adds

- `@dxos/app-toolkit/RegistryDescriptor`: `describe({ schemas, operations, skills })` returns the index
  and the descriptor files, named by a SHA-256 prefix of their content.
- `plugin-file/src/registry-items.test.ts`: the round-trip findings above and a run of `describe`
  over plugin-file's real items.

Not done: the build does not emit the files yet. The next step is in the `dx-plugin-config` Vite
plugin: for modules made by `AppCapability.schema`, `skillDefinition` and `operationHandler`
(with PR 2's declared operations), evaluate the data in the runnable environment, call `describe`,
`emitFile` each descriptor as an asset, and write `registry` into the manifest.

## Migration

- 65 configs use `AppCapability.schema`, 41 use `skillDefinition`, 74 use `operationHandler`.
- Types and skills need no config change: the build reads their existing module bodies. A schema or
  skill module that cannot load headless fails the build, which is the check we want.
- Operations need PR 2's declarations first (mechanical, a codemod).

## Open questions

1. Should a lossy type (finding 2) be flagged in the descriptor, like `opaqueInputs`, or should the
   JSON Schema encoder keep `contentEncoding` on decode?
2. Does a descriptor list the operations behind a skill's tools by URI only, or embed their
   descriptors? The spike uses URIs: the operations are separate index entries.
3. Who reads the descriptors first: the plugin-registry UI, EDGE's operation routing, or MCP
   `queryOperations` for a plugin that is not activated? That decides which kind to wire first.
4. Should `PluginRelease` in `@dxos/protocols` carry the index, so the registry can list a plugin's
   items without fetching its manifest?

## Verification

- `moon run plugin-file:build` (the dependency graph) succeeded.
- `vitest run src/registry-items.test.ts` in plugin-file: 5 passed.
- `tsc --noEmit` for app-toolkit and plugin-file: no errors.
- Not done: no build-time emission, so no end-to-end check of the manifest.
