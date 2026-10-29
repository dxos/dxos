# Declaring operations in `dx.config.ts` (spike)

## Problem

A plugin's operations are known only after its operation-handler module loads: `dx.config.ts`
names the module (`AppCapability.operationHandler(() => import('./src/capabilities/operation-handler.ts'))`),
and the module body builds an `OperationHandlerSet.lazy([...])` from definitions and handler loaders.
So the build cannot list what a plugin provides, the registry, MCP `queryOperations`, and a plugin
catalog all need the plugin to activate first, and nothing checks that the list stays complete.

The config is evaluated at build time (a node subprocess for `Config2`, a Vite runnable environment
for the manifest) and serialized to JSON. Whatever it imports must load headless: no React, no
handler code.

## What the spike does

1. `AppCapability.operationHandler(loader, { operations: [Def, ...] })` takes the operation
   **definitions** the module implements. Definitions are already import-light by convention
   (`src/types/<Plugin>Operation.ts`: schemas only, no handlers), so the config can import them.
2. The maker wraps the loader with `Capability.wrapLoader` and an adapter,
   `@dxos/app-toolkit/OperationHandlerAdapter`, whose JSON `args` are the operation **keys**. This is
   the same mechanism `AppCapability.surface({ roles })` uses through `SurfaceAdapter`.
3. Because adapter args are copied into `Plugin.ManifestModule.adapter.args`, the manifest now
   carries the plugin's operation keys. That is the build-time serialization, with no new
   `Config2` field.
4. When the body loads, the adapter compares declared keys with the keys the contributed handler
   sets implement (`diffOperations`) and logs both directions of drift: an undeclared operation is
   invisible to manifest readers, and a declared but unimplemented one is a broken promise.
5. `plugin-file` declares its five operations as the worked example.

Runtime references stay what they are today: invokers import the definition object
(`FileOperation.Create`) and the registry resolves it by key. Nothing in the runtime path changes.

## Next steps (not in the spike)

- **First-class manifest field.** Promote the keys from `adapter.args` to
  `ManifestModule.operations` (and optionally name/description) so readers need not know the
  adapter's arg shape. Add the same to the library-build manifest.
- **Activate on invoke.** With keys in the manifest, an operation-handler module can activate on an
  `OperationInvoked(key)` event instead of Startup/Idle. The open problem is definitions: the
  registry needs the full definition (schemas) to validate input and to describe tools before the
  handler module loads. Options: load the definitions module eagerly (it is small) as its own
  manifest entry, or emit JSON Schema per operation at build time (lossy for ECHO refs and
  transforms, so probably only for discovery, not validation).
- **Move the whole map into the config.** Instead of definitions plus one module, the config could
  hold `[[Def, () => import('./src/operations/create.ts', { with: { type: 'module-url' } })], ...]`
  and the build would emit one chunk per handler and generate the handler set. This removes the
  `operation-handler.ts` boilerplate in 74 plugins and makes drift impossible, but it needs a
  manifest shape with per-operation URLs instead of one `url` per module.
- **Static check.** A lint or `check-plugin-set` step that fails CI on drift, so the runtime log is
  a backstop, not the only signal.

## Migration

74 `dx.config.ts` files use `AppCapability.operationHandler`; 90 files build handler sets with
`OperationHandlerSet.lazy`. The migration is mechanical: for each plugin, copy the definitions from
`src/operations/index.ts` into the config's `operations` array. A codemod can do it, since every
`lazy` entry is `Def.pipe(Operation.lazyHandler(...))`. Make `operations` required once every
plugin declares it.

## Open questions

1. Keys only, or keys plus name/description in the manifest? More data helps a plugin catalog but
   grows every manifest.
2. Should the definitions module be required to be import-light by a check (a lint rule on
   `src/types/*Operation.ts` imports), since the config now depends on it?
3. Which of the two end states — definitions declared next to a handler module, or the full map in
   the config — do we want? The second is better but changes the manifest format.
4. Do headless hosts (EDGE `workerd`) read the manifest list to route operations, or keep their own
   registry?

## Verification

Not built or tested: `node_modules` is not installed in the spike's environment. The new unit test
(`OperationHandlerAdapter.test.ts`) and the typecheck of `plugin-file`'s config still need a run.
