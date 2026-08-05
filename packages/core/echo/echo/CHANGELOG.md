# @dxos/echo

## 0.11.0

### Minor Changes

- f9ba47a: Agents become identity/presets (breaking, no data migration — 0.1.0 agents must be recreated): `Agent` 0.2.0 keeps only name, DID, enabled, and a typed `Instructions` ref; a chat and the agent it runs as are linked by the `CompanionTo` relation (resolved with `AgentChat.loadAgent` / `AgentChat.loadChat`), neither type referencing the other by field; durable artifacts belong to a Project collection; subscriptions and cron schedules compile to Routines whose relay qualifies events with a cheap model and forwards them onto the durable agent session.
- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- b5ecf54: Chats carry a typed `instructions` ref rendered into the system prompt at request time (replacing typename-based inlining of bound Instructions objects, which now bind as ordinary context objects), and the new Project skill lets the assistant file created objects into a project's artifacts collection and list them.
- 3f6ac61: Make the published `@dxos/cli` runnable, and keep React out of node and bun builds.

  `@dxos/cli@0.10.0` could not execute at all once installed from npm. Nothing marked `external` in
  the compiled binary can resolve at runtime (Bun's embedded filesystem has no `node_modules`), so the
  externals are gone and `esbuild-wasm`'s WASM is inlined; the `@dxos/node-std` shims resolve to node
  builtins, since Bun miscompiles `export * from 'node:<mod>'`; `@automerge/automerge-subduction` uses
  its self-contained `web` entry rather than the `node` one that reads a sibling file; the platform
  binary keeps its executable bit through publishing; and the pinned bun no longer leaks `--smol` into
  `process.argv`. Persistent SQLite on bun also now creates its parent directory, which any `dx`
  command needed on a machine with a stored profile but no data root.

  The binary also contained React, react-dom and the whole `react-ui` graph. `Capability.lazy`,
  `OperationHandlerSet.lazy` and `React.lazy` defer evaluation but not bundling, so plugin barrels that
  merely listed a React surface pulled it into every non-browser consumer: the plugins with a node
  variant now have node-conditioned `#capabilities`, and `plugin-sheet` a node-conditioned
  `#operations`. Headless code no longer reaches for React packages — `@effect-atom/atom` instead of
  `@effect-atom/atom-react` wherever only `Atom`/`Registry`/`Result` are used, and `@dxos/client/*`
  instead of `@dxos/react-client/*`. `@dxos/ui-editor/headless` is a new UI-free entrypoint for the
  editor helpers operation handlers need.

  Breaking:
  - `formatForDisplay` and `formatForEditing` move from `@dxos/react-ui-form` to `@dxos/schema`.
  - `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
    `@dxos/plugin-transcription`.
  - The icon list moves from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is
    removed; `hues` moves from `@dxos/ui-theme` to `@dxos/ui-types` beside `ChromaticPalette`.
  - `@dxos/plugin-graph` no longer exports its React hooks from the package root — import them from
    `@dxos/plugin-graph/hooks`.
  - `@dxos/plugin-deck` and `@dxos/plugin-navtree` are browser-only: `#plugin` no longer resolves a
    `node` or `workerd` condition.

- 091ebe4: The `dx` binary no longer depends on the machine that built it: `@dxos/kv-store`'s `createLevel` moves to `@dxos/kv-store/level` so importing the package for its types no longer binds LevelDB's native addon, and Automerge's WASM is inlined rather than read from disk. `LevelDB`, `SublevelDB` and `BatchLevel` are unchanged on the main entry. Each `@dxos/cli-<platform>-<arch>` package also exposes `dx` directly, so one platform can be installed without pulling the rest.
- 46ec569: Add ECHO-core per-object time travel and subtree branching: `setTimeTravel`/`clearTimeTravel` pin a live object to a historical version (writes throw, `latestOnly` subscribers stay live), `createBranch`/`switchBranch`/`mergeBranch`/`deleteBranch` fork an object subtree into writable CRDT branches with shared history and true merge-back, and `db.branch()` returns caller-owned writable per-surface branch bindings.
- f8637f1: New `Lens` namespace: an **object lens** that views one live ECHO object through a second declared type. Sibling of the existing `Panproto` wire lens, which crosses the serialization boundary to a foreign record — an object lens never creates a second object, so reads project the base object and writes invert onto it.

  A lens binds two written-out types (`Lens.make(id, Source, Target, mapping)`), so the target's TypeScript type is the view's type and an interface written once against the target works for every source that maps to it. A lensed object reports the _target's_ typename, so surfaces and forms already written for that type resolve unchanged, while `Obj.getURI` still resolves to the underlying object.

  The mapping is partial. A target property with a same-named, type-compatible source property maps itself; one with no counterpart stores itself in the object's annotation dictionary; a name match whose types are incompatible is reported by `Lens.coverage` as suspicious rather than auto-mapped or auto-overlaid, since either would record the same fact twice and let the copies drift. `Lens.coded` covers transforms a per-property mapping cannot express, such as parsing.

  `Lens.of` returns a live handle the ordinary `Obj.*` API accepts, including `Obj.update`, which batches every assignment in its callback into a single change touching only the properties actually assigned — so two peers editing one object through different lenses merge instead of clobbering each other. `Lens.checkLaws` verifies the GetPut round trip, `Lens.register` preserves its argument's precise type, and a declarative mapping can be persisted as an ordinary ECHO object (`Lens.Object`) referencing its value conversions by registered codec name.

  `useLens` ships on the new `@dxos/echo-panproto/react` entrypoint, mirroring `@dxos/echo-react`'s `useObject` tuple and overload shape. It sits on its own subpath so the package's main entry stays React-free for worker contexts. A lens holds no state: the hook subscribes to the base object for the render schedule and projects on every render, so replicated changes, overlay writes, and character-level text edits all reproject.

  The wire lens schema moved from `src/lens.ts` to `src/wire-lens.ts`, internal to the package; the `Panproto` export surface is unchanged.

- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
- 7b270f2: Feed-backed objects are now live by default: `Obj.update` synchronously mutates and notifies subscribers, identity is stable across queries and re-appends, and updates persist as a background whole-object re-append. Direct property assignment on a feed-backed object outside `Obj.update` now throws instead of silently mutating in memory.
- af5fbf4: Add soft-fork support to feeds: `Feed.append(feed, items, { parent })` continues a feed from an earlier item, and `Feed.history(items)` resolves the live branch at read time. Feeds that set no parent are unaffected.

### Patch Changes

- 46ec569: Remap branch-registry document urls when a space is imported or copied (branch documents live outside `links`, so they were previously left pointing at the source space), and resolve a ref atom to `undefined` on its initial read when the target is already deleted (previously only handled on later updates).
- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- 7b270f2: Disposing a feed handle now drains pending local updates before tearing down its object cache, instead of discarding them. Previously an `Obj.update` followed in the same tick by a database close (or a feed-handle eviction) cleared the dirty set before the scheduled background append ran, so the write was always lost. The drain is best-effort, matching the existing append contract where a failed send is retried in the background rather than surfaced — a send that keeps failing can still leave writes unpersisted.
- d547045: Allow the object form of `GeneratorAnnotation` (`{ generator, args }`) in serialized JSON schema, so operations referencing schemas that use it (e.g. `Task`) can be registered on remote hosts. Adds a workerd entry point for the tasks plugin so its operations can run headlessly.
- 923d5be: Auto-create a recurring sync Routine when a mailbox or calendar is bound to a connection (new connection, multi-target selection, or reusing an existing connection); the toolbar "Sync" action force-runs it and disables while a sync is already in progress. Fixes a legacy-DXN compatibility gap in `refToEffectSchema` and a bug where cancelling a Gmail sync left its progress monitor stuck at "running".
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 12fd785: Fix memoized language model dynamic-value remapping: collect tokens over the normalized prompt so timestamp metadata cannot shift positional ids, and preserve per-pattern regex flags so uppercase-hex UUIDs match.
- 5f08a6a: Stop the client-side diagnostics from retaining the whole ECHO client graph. Every `QueryResultImpl` added a record to a module-level `QUERIES` set that nothing ever pruned, and while the record held no direct reference to the query, it held a `StackTrace` — which keeps an unformatted `Error`, and V8 retains a captured stack structurally, with a strong reference to each frame's receiver, until `.stack` is read. The frame for `new QueryResultImpl(...)` therefore pinned the query, its query context, the hypergraph, the client, the database and every document loaded through them: one entire client graph per query, for the lifetime of the process. On hosts that never read the diagnostics this was unbounded — a Cloudflare Worker running ECHO operations on a cron trigger OOMed after ~390 invocations. `QueryResultCache` is a `WeakDictionary` precisely so results can be collected; this defeated it.

  `QUERIES` now holds weak refs pruned by a `FinalizationRegistry`, so a query, its diagnostic and its graph collect together. `OBJECT_DIAGNOSTICS` had the same defect on a longer fuse and now stores the formatted string; being keyed by object id and never evicted, it is also capped at 1,000 entries with oldest-first eviction. `StackTrace` formats once and releases the `Error`, making the release deterministic rather than incidental, and documents the retention hazard.

- 3761762: Report writes that were never sent, and stop a scheduled callback from running concurrently with itself. `UpdateScheduler` now starts its callback from a single site: `runBlocking`/`forceTrigger` funnel into the scheduled runner instead of claiming it themselves, so two passes can no longer each claim part of the shared queue — the loss behind server-side writes arriving without their data. `RepoProxy.flush()` rejects when a batch could not be sent instead of always resolving, so a short-lived writer whose isolate is disposed the moment flush resolves can fail its operation rather than silently drop the write.
- 4bb7e3b: Chats no longer spend a `query-skills` call before every `enable-skills` — the available-skills list is already rendered into the system prompt — and project chats pre-bind the artifact-type skills, so creating the artifact you asked for costs fewer tool calls. Deleting an object now also closes planks for the objects it cascade-deletes (e.g. a project's chats), which previously stayed open pointing at removed objects.
- 686fac1: Fix: re-entering Suggesting mode no longer strikes through text typed on main in between. An unedited per-user suggestion branch whose fork point fell behind is retired and re-forked at the current heads; a branch with pending suggestions is preserved.
- ac51564: Documents created from the editor's slash/link menu are now filed in the same collection as the document they were created from, instead of the space root.
- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
