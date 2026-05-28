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

## 2. Automerge / text editing: expose via `@dxos/echo` and a dedicated text package

### Problem

`createDocAccessor`, `DocAccessor`, `updateText`, and six cursor helpers (`toCursor`, `fromCursor`,
`toCursorRange`, `getTextInRange`, `getRangeFromCursor`, `IDocHandle`) are used in ~40 files across
UI, plugins, and editor packages. They are currently implemented in `echo-db` but have nothing
inherently DB-internal about them—they are automerge document utilities.

### Proposal

**2a. `Obj.updateText` → move to `@dxos/echo`**

`updateText(obj, path, newText)` is a one-liner that goes through `createDocAccessor` and calls
`A.updateText`. It operates at the `Obj` level with no DB-internal knowledge. Move it into the `Obj`
namespace in `@dxos/echo` as `Obj.updateText`. The two existing callers
(`plugin-outliner/Journal.ts`, `plugin-native-filesystem/markdown-documents.ts`) switch to
`import { Obj } from '@dxos/echo'` and call `Obj.updateText(...)`.

**2b. `createDocAccessor` + `DocAccessor` + cursor helpers → new `@dxos/echo-text` package**

These are automerge handle accessors and cursor math. They are widely used in UI and editor code and
have no business being imported from an internal DB package. Extract to a new
`packages/core/echo/echo-text` (or `packages/ui/ui-editor-automerge`) package that depends only on
`@dxos/echo` and `@automerge/automerge`.

Exports: `DocAccessor`, `IDocHandle`, `createDocAccessor`, `toCursor`, `fromCursor`,
`toCursorRange`, `getTextInRange`, `getRangeFromCursor`.

All ~40 import sites switch from `@dxos/echo-db` to the new package. `echo-db` can then re-export
from it for its own internal use and remove the implementations.

Alternatively (simpler, lower risk): publish these as a stable sub-path
`@dxos/echo-db/text` using an exports condition, treating them as a promoted stable surface while
keeping the code in place. The editor/UI packages import from `@dxos/echo-db/text` rather than the
default barrel, signalling intent without a package split.

**Effort:** 2a is ~2 hours. 2b (new package) is ~1 day including wiring moon/tsconfig. Sub-path
approach is ~2 hours.

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
context and need to construct a runtime snapshot.

Fix: Expose `feedServiceLayer` as a getter on the `Space` type (parallel to `space.db` and
`space.queues`). Implementation: the space builds it lazily from `space.queues` the first time. All
category B call sites replace `createFeedServiceLayer(space.queues)` with `space.feedServiceLayer`.

Once both categories are fixed, `createFeedServiceLayer` becomes internal to `echo-db` (only used
by `plugin-client`'s `DatabaseLayerSpec` and `TestDatabaseLayer`). Its public export can be removed
from the `echo-db` barrel.

**Effort:** Category A is ~half a day. Category B (adding `space.feedServiceLayer`) requires touching
the `Space` class in `client-protocol` or `client` — ~half a day. Total: ~1 day.

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
