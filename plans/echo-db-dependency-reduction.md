# `@dxos/echo-db` Dependency Reduction Plan

Based on the [usage audit](./echo-db-usage-audit.md). Goal: shrink the footprint of `@dxos/echo-db`
so that high-level consumers (plugins, apps, SDK users) import from stable, purpose-specific packages
(`@dxos/echo`, a new text package, the client SDK) rather than directly from the internal DB layer.

Usages kept as-is: test infrastructure (`EchoTestBuilder`, `TestDatabaseLayer`), internal database
wiring (`EchoClient`, `EchoDatabaseImpl`, `CoreDatabase`), object internals (`ObjectCore`,
`getObjectCore`, `migrateDocument`), and serialization (`Serializer`, `SerializedSpace`).

---

## 1. Move `Filter` / `Query` imports to `@dxos/echo` (easy, mechanical)

### Problem

`Filter` and `Query` are already defined in `@dxos/echo`. `echo-db` merely re-exports them from
`packages/core/echo/echo-db/src/query/index.ts`:

```ts
export { Filter, Query } from '@dxos/echo';
```

Yet 7 call sites still import them from `@dxos/echo-db`.

### Change

Delete the re-export. Update all 7 import sites to use `@dxos/echo` directly.

| File                                                     | Current                | After               |
| -------------------------------------------------------- | ---------------------- | ------------------- |
| `packages/sdk/client/src/echo/space-list.ts`             | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/sdk/client/src/echo/space-proxy.ts`            | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/sdk/client/src/echo/import.ts`                 | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/sdk/client/src/tests/client.test.ts`           | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/sdk/client/src/tests/indexing.test.ts`         | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/plugins/plugin-discord/src/operations/sync.ts` | `from '@dxos/echo-db'` | `from '@dxos/echo'` |
| `packages/devtools/cli/src/commands/chat/processor.ts`   | `from '@dxos/echo-db'` | `from '@dxos/echo'` |

Also remove the `sdk/client` barrel re-export of `Filter` (currently re-exported through
`client/src/echo/index.ts` via `echo-db`). Verify `Filter` is already available on the public
`@dxos/client` surface through `@dxos/echo`.

**Effort:** ~1 hour. No logic changes.

---

## 2. Automerge / text editing: what consumers actually need and how to hide automerge

### What each consumer uses from the current API

The ~40 import sites fall into three distinct layers with very different needs:

#### Layer A — CodeMirror sync (`ui-editor/src/extensions/automerge/`)

These files implement the automerge ↔ CodeMirror bridge and **legitimately depend on automerge**:

| File                  | Automerge API used                                                        |
| --------------------- | ------------------------------------------------------------------------- |
| `automerge.ts`        | `A.getHeads(doc)` to track revision heads; `accessor.handle.doc()`        |
| `sync.ts`             | `A.getHeads`, `A.diff`, `A.equals` to compute patches between revisions   |
| `update-automerge.ts` | `handle.changeAt(heads, fn)`, `A.splice` to apply editor edits to the doc |
| `cursor.ts`           | `A.getCursor`, `A.getCursorPosition` for stable position encoding         |

These must import `@automerge/automerge` directly. No amount of abstraction eliminates that — they
are implementing the CRDT sync protocol. They should declare the dependency explicitly rather than
inheriting it through `@dxos/echo-db`.

#### Layer B — Sketch / TLDraw adapter (`plugin-sketch/src/util/base-adapter.ts`, `actions.ts`)

The sketch adapter drives TLDraw from an automerge document that stores a `Record<string, TLRecord>`
map. It uses:

- `accessor.handle.doc()` — reads the raw map to initialize the TLDraw store
- `accessor.handle.change(fn)` — mutates the map (add/delete/update shapes)
- `accessor.handle.addListener/removeListener` — reacts to remote changes

The callback in `handle.change(fn)` receives the automerge doc but only uses `getDeep(doc, path)`
to navigate into it — **no automerge API functions are called inside the callback itself**. The
mutation is plain JS object manipulation (`map[record.id] = encode(record)`).

This means sketch's dependency on automerge is superficial: it needs the raw doc only because
`IDocHandle` returns `Doc<T>` rather than `unknown`. If `doc()` returned `unknown`, all the sketch
code works unchanged after a trivial `as any` or a typed helper.

#### Layer C — Plugin code (all remaining ~30 files)

Plugins like `plugin-markdown`, `plugin-thread`, `plugin-script`, `plugin-code`, `plugin-generator`,
`plugin-sheet`, `plugin-assistant`, etc. use `createDocAccessor` and the cursor helpers. Their
actual needs:

| What they do           | Current API                                                         | Automerge leakage                              |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| Pass to editor         | `{ text: createDocAccessor(obj, ['content']) }`                     | `DocAccessor` type contains `IDocHandle`       |
| Read text content      | `DocAccessor.getValue<string>(accessor)`                            | None — wraps `getDeep(handle.doc(), path)`     |
| Update text atomically | `accessor.handle.change((doc) => A.updateText(doc, path, newText))` | `A.updateText` leaks                           |
| Stable cursor position | `toCursorRange(accessor, from, to): string`                         | Return type is `A.Cursor` (alias for `string`) |
| Decode cursor          | `getRangeFromCursor(accessor, cursor: string)`                      | None                                           |
| Text in range          | `getTextInRange(accessor, start, end)`                              | None                                           |

The **only** automerge leakage to layer C is:

1. The `IDocHandle` type on `DocAccessor.handle` (exposes `Doc<T>`, `ChangeFn<T>`, `Heads`)
2. The `A.Cursor` type alias on the return of `toCursor` (it's just `string` at runtime)
3. `updateText` calling `A.updateText` inside `handle.change` (not visible to callers)

### How to eliminate automerge from layer C and B

**`A.Cursor` → `string`**

`A.Cursor` is `string` in automerge. Changing the return type of `toCursor` from `A.Cursor` to
`string` is a no-op at runtime and removes the only type-level automerge leak in the cursor API.
`fromCursor` already accepts `A.Cursor` which is `string`, so its signature is already clean.

**`IDocHandle` → opaque handle interface with no automerge types**

Change the `IDocHandle` interface to not expose automerge types:

```ts
// Before — leaks Doc<T>, ChangeFn<T>, Heads from automerge
interface IDocHandle<T = any> {
  doc(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>): Heads | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}

// After — no automerge types at all
interface IDocHandle<T = any> {
  doc(): T | undefined;
  change(callback: (doc: T) => void): void;
  changeAt(heads: unknown, callback: (doc: T) => void): unknown;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}
```

The editor layer (`ui-editor`, the legitimate automerge consumer) holds the concrete
`AutomergeRepo.DocHandle` which satisfies this interface. It can call
`A.getHeads(handle.doc() as A.Doc<unknown>)` — a single cast at the boundary, contained in the
editor package.

The sketch adapter works unchanged: its `handle.change(fn)` callback uses plain JS object
manipulation, not automerge API functions.

**`Obj.updateText` → move to `@dxos/echo`**

`updateText(obj, path, newText)` calls `A.updateText` inside `handle.change`. Plugin callers don't
see the automerge call — they just call `updateText(obj, path, text)`. Moving to `Obj.updateText`
in `@dxos/echo` (which can depend on `echo-db` internally or have `echo-db` expose the
implementation) removes the import from plugin code entirely. The two current callers
(`plugin-outliner/Journal.ts`, `plugin-native-filesystem/markdown-documents.ts`) switch to
`Obj.updateText(obj, ['content'], newText)`.

**`createDocAccessor` → `Obj.getDocAccessor` or a stable re-export**

`createDocAccessor(obj, path)` only needs `echo-db` internals (`getObjectCore`, `symbolPath`). It
cannot move to `@dxos/echo` without creating a circular dependency — `echo` has no knowledge of the
CRDT layer. Options:

- **Stay in `echo-db`, re-export as a stable surface** (lowest friction). Plugins continue to import
  `createDocAccessor` from `@dxos/echo-db`. With the `IDocHandle` interface cleaned up, the
  automerge types are no longer visible to callers. The function itself is a stable bridge between
  the `Obj` proxy layer and the CRDT handle layer.
- **New package `@dxos/echo-crdt`** containing `createDocAccessor`, `DocAccessor`, `IDocHandle`,
  and the cursor helpers. Both `echo-db` and `ui-editor` depend on it. Plugin packages import from
  `@dxos/echo-crdt`. This is the cleanest long-term shape but requires a new package.

### Summary: what needs to change

| Item                                             | Action                                               | Automerge removed from callers? |
| ------------------------------------------------ | ---------------------------------------------------- | ------------------------------- |
| `A.Cursor` return type on `toCursor`             | Change to `string`                                   | Yes                             |
| `Doc<T>`, `ChangeFn<T>`, `Heads` on `IDocHandle` | Change to `unknown`/generic                          | Yes                             |
| `updateText` → `Obj.updateText`                  | Move to `@dxos/echo`                                 | Yes (2 callers)                 |
| `createDocAccessor`                              | Keep in `echo-db`, clean interface is enough         | Yes (types are clean)           |
| `ui-editor` automerge extensions                 | Import `@automerge/automerge` directly               | n/a (expected)                  |
| `plugin-sketch` adapter                          | No change needed; `handle.change(fn)` stays abstract | Yes                             |

**Effort:** Interface cleanup (~2h), `Obj.updateText` move (~1h), `ui-editor` direct automerge dep
(~30min). No new packages required in this path.

---

## 3. Centralize `createFeedServiceLayer` — eliminate per-call-site construction

### Problem

`createFeedServiceLayer(space.queues)` is called at 22 sites. It always takes the same argument
(`space.queues`) and always produces the same `Feed.FeedService` layer. The function is already
provided in one central place: `plugin-client`'s `DatabaseLayerSpec` contributes `Feed.FeedService`
to the space-scoped Effect layer graph.

The 22 sites split into two categories:

**Category A — Effect operations that already run inside a LayerSpec context (13 files)**

These include `plugin-discord/sync.ts`, `plugin-slack/sync.ts`, `plugin-thread/append-channel-message.ts`,
`plugin-inbox/*`, `plugin-pipeline/stories`, etc. They manually call
`Effect.provide(createFeedServiceLayer(space.queues))` inside operation handlers, even though the
operation runtime will have `Feed.FeedService` available in context when operations are invoked via
the LayerSpec system.

Fix: Remove the `Effect.provide(createFeedServiceLayer(...))` wrappers. Declare `Feed.FeedService`
as a requirement in the operation's Effect type signature instead (it will be satisfied by the
ambient layer). Verify with the existing `DatabaseLayerSpec` that `Feed.FeedService` is indeed
already in scope when these operations run.

**Category B — Imperative hooks and non-Effect code (9 files)**

These include `useChatProcessor.ts`, `useContextBinder.ts`, `run-prompt-in-new-chat.ts`,
`create-chat.ts`, `feed-logger.ts`, `cli/processor.ts`, `cli-util/space.ts`,
`devtools/WorkflowDebugPanel.tsx`, `stories-assistant/*`. They run outside the LayerSpec Effect
context and need to construct a runtime snapshot explicitly.

These sites exist because the operations are triggered imperatively (React hooks, CLI commands)
rather than through the Effect layer system. The right fix is not to expose a pre-built layer on
`Space` — `Space` shouldn't know about Effect layers. Instead, the callers should be migrated into
the Effect operation system so they are invoked through the LayerSpec context like category A.
Until that migration happens, these sites keep their explicit `createFeedServiceLayer(space.queues)`
calls.

**Effort:** Category A is ~half a day per the investigation below.

---

## 4. Drop `@dxos/echo-db` from package.json where not needed

### 4a. Zero-source-import packages — drop immediately (no code change needed)

18 packages declare `@dxos/echo-db` as a dependency but have zero TypeScript source imports. These
are almost certainly transitive copies or stale entries from scaffolding.

| Package                   | Notes                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `react-ui-stack`          | No source usage                                                                            |
| `react-ui-thread`         | No source usage                                                                            |
| `react-ui-canvas-compute` | No source usage                                                                            |
| `stories-ui`              | No source usage                                                                            |
| `app-graph`               | No source usage                                                                            |
| `react-edge-client`       | No source usage                                                                            |
| `operation`               | No source usage                                                                            |
| `ai`                      | No source usage                                                                            |
| `assistant-toolkit`       | No source usage                                                                            |
| `graph`                   | No source usage                                                                            |
| `plugin-automation`       | No source usage                                                                            |
| `plugin-chess`            | No source usage                                                                            |
| `plugin-support`          | No source usage                                                                            |
| `plugin-meeting`          | No source usage                                                                            |
| `plugin-preview`          | No source usage                                                                            |
| `plugin-transcription`    | No source usage                                                                            |
| `compute-hyperformula`    | No source usage                                                                            |
| `app-framework`           | String reference in vite plugin package list (not an import); move to a constant or inline |

Action: remove `"@dxos/echo-db": "workspace:*"` from each. Run `moon run :build` to confirm nothing
breaks.

**Effort:** ~30 minutes.

### 4b. Packages that only import `Filter` / `Query` — drop after step 1

Check after completing step 1: several packages (e.g. `sdk/client`) may keep the dependency for
other symbols. Audit and remove where `Filter`/`Query` were the only reason.

### 4c. Packages that only import `createFeedServiceLayer` — drop after step 3

After centralizing to `space.feedServiceLayer`: `plugin-discord`, `plugin-slack`, `plugin-thread`,
`plugin-inbox`, `plugin-pipeline`, `plugin-assistant` (hooks and operations), `devtools`, `cli`,
`cli-util`, `stories-assistant` can all drop the `@dxos/echo-db` dependency (they will either use
the Effect context or `space.feedServiceLayer`).

### 4d. Packages that only import `createDocAccessor` / editor symbols — drop after step 2

After step 2: all editor and plugin packages that use `createDocAccessor`/`DocAccessor`/cursor
helpers will import from `@dxos/echo-text` (or the sub-path) instead.

This covers the largest group: `react-ui-editor`, `ui-editor`, `react-ui-form`, `plugin-markdown`,
`plugin-script`, `plugin-sketch`, `plugin-code`, `plugin-sheet`, `plugin-generator`,
`plugin-thread`, `plugin-outliner`, `plugin-assistant`, `echo-generator`, `testbench-app`,
`stories-assistant`, `blade-runner`.

### 4e. `plugin-trip` version pin

`plugin-trip` incorrectly pins `"@dxos/echo-db": "workspace:^0.8.3"` instead of `workspace:*`.
Fix regardless of other steps.

---

## Summary: expected dependency footprint after all steps

| Package                                 | Uses remaining                                                                                                                                      | Still needs echo-db?    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `sdk/client`                            | `EchoClient`, `SpaceSyncState`, `QueryResultImpl`, `Serializer`, `decodeDXNFromJSON`, `createSubscription`, `ObjectMigration`, `SubscriptionHandle` | Yes (core SDK layer)    |
| `sdk/client-protocol`                   | `type QueueFactory`, `type SpaceSyncState`                                                                                                          | Yes (type-only)         |
| `sdk/client-services`                   | `type SerializedSpace/Feed`                                                                                                                         | Yes (space export)      |
| `sdk/migrations`                        | `ObjectCore`, `migrateDocument`, `DocHandleProxy`, `RepoProxy`                                                                                      | Yes (internal)          |
| `plugin-client`                         | `createFeedServiceLayer` (in DatabaseLayerSpec)                                                                                                     | Yes (one central place) |
| `sdk/schema`                            | `RuntimeSchemaRegistry`, `DatabaseSchemaRegistry`                                                                                                   | Yes                     |
| `echo-atom`, `echo-react`, `echo-solid` | `createObject`, `EchoTestBuilder`                                                                                                                   | Yes (test infra)        |
| `echo-generator`                        | `getObjectCore`                                                                                                                                     | Yes                     |
| `devtools`                              | `checkoutVersion`, `getEditHistory`, `type SpaceSyncState`                                                                                          | Yes                     |
| `blade-runner`, `proto-guard`           | `Serializer`, `EchoTestBuilder`, replication types                                                                                                  | Yes (e2e)               |
| `conductor`, `functions-runtime*`       | `TestDatabaseLayer`, `makeFeedService` (testing)                                                                                                    | Yes (test infra)        |
| `compute-runtime`                       | `TestDatabaseLayer`                                                                                                                                 | Yes (test infra)        |
| `plugin-space`                          | `EchoDatabaseImpl`, `Serializer`                                                                                                                    | Yes                     |
| `functions-runtime-cloudflare`          | `EchoClient`, `CoreDatabase`, `EchoDatabaseImpl`                                                                                                    | Yes                     |
| `functions`                             | `EchoClient`, `EchoDatabaseImpl`                                                                                                                    | Yes                     |
| 18 zero-import packages                 | —                                                                                                                                                   | **Drop immediately**    |
| ~16 editor/plugin packages              | `createDocAccessor` only                                                                                                                            | **Drop after step 2**   |
| ~10 feed-layer packages                 | `createFeedServiceLayer` only                                                                                                                       | **Drop after step 3**   |
