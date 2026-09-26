---
branch: claude/gracious-planck-u410r3
commit: 9ffccd568bae5acd1e5b0494bf43be72583cc317
base: aa1b06db427c9dca37179335b819361d05956872
mode: default
createdAt: 2026-09-25T09:25:27.186Z
isFinalized: true
groups: 99
rules: [declare-optional-services-with-noop-layers, import-as-namespace-is-all-or-nothing, no-casts, no-hand-rolled-lists, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, subscribe-where-you-read, toolbars-are-menu-actions, write-through-the-live-object]
reviewId: 9ffccd56
---

_4 error(s), 65 warning(s)._

# WARN 9ffccd56-1 no-sleep-in-test `packages/common/effect/src/AtomEx.test.ts:69:7`

The `wait` helper (`new Promise((resolve) => setTimeout(resolve, ms))`) is used at lines 22, 27, 36 and 52 to synchronize with `AtomEx.makeRegistry`'s idle-TTL grace period by sleeping for a duration proportional to `TTL`. This is exactly the case `no-sleep-in-test` calls out for Effect's `TestClock`: replace the real timer with a virtual clock (or `vi.useFakeTimers`) so the grace-period expiry is advanced deterministically instead of via a real 100/300ms wait.

# ERROR 9ffccd56-2 no-casts `packages/common/effect/src/AtomEx.ts:58:47`

New `makeOwned` widens its generic bound to `<A extends Atom.Atom<any>>`, an `any` in a signature with no comment saying why (per the `no-casts` rule, a cast/widened-`any` is acceptable only at a genuine type-system boundary with a concise justifying comment). The sibling pattern this mirrors (e.g. `RpcClient<any>` in `packages/core/compute/compute-runtime/src/ProcessManager.ts:74`) documents the reason inline ("`RpcClient` is invariant in its type parameter"); if `Atom.Atom` is invariant here too, add the same kind of comment explaining why `any` (not `unknown`) is required — otherwise narrow the bound to `Atom.Atom<unknown>`.

# WARN 9ffccd56-3 import-as-namespace-is-all-or-nothing `packages/common/sql-sqlite/src/OpfsWorker.ts:47:1`

`export interface OpfsWorkerConfig` is a namespace-module member (the file carries `@import-as-namespace` and the barrel re-exports it as `OpfsWorker`) prefixed with the namespace's own name. Per the rule's own example — "`Options`, not `FooOptions` — callers write `Foo.Options` either way" — rename it to `Config` (`OpfsWorker.Config`) and update the internal use on line 68.

# WARN 9ffccd56-4 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-code-mode/src/Wire.ts:5:1`

`Wire.ts` carries the `@import-as-namespace` directive, has a capital-case filename, and every internal consumer (`WorkerSandbox.ts`, `WorkerSandboxRuntime.ts`) correctly imports it as `import * as Wire from './Wire.ts'` — but the package barrel (`packages/core/compute/agent-code-mode/src/index.ts`) never re-exports it as `export * as Wire from './Wire.ts'`, unlike every sibling module in the same directory (`Sandbox`, `WorkerSandbox`, `WorkerSandboxBrowser`, `WorkerdSandbox`). Per `import-as-namespace-is-all-or-nothing`, the barrel re-export is one of the four signals that must agree; add the missing `export * as Wire from './Wire.ts';` line to `index.ts`.

# WARN 9ffccd56-5 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:47:1`

`export type WorkerSandboxOptions` is redundantly prefixed with the namespace's own name inside a module marked `@import-as-namespace` and barrel-exported as `WorkerSandbox`. Per `import-as-namespace-is-all-or-nothing`, rename it to `Options` (referenced as `WorkerSandbox.Options`) and update the two internal uses (lines 77 and 334).

# WARN 9ffccd56-6 no-trivial-wrappers-over-official-apis `packages/core/compute/agent-code-mode/src/WorkerSandboxBrowserWorker.ts:51:7`

`const report = (message: WorkerSandboxBrowser.BrowserWorkerMessage) => self.postMessage(message);` is a module-local one-liner whose body is a single, unmodified call to the official Web Worker `postMessage` API — no branching, error handling, derived value, or non-trivial default. Per `no-trivial-wrappers-over-official-apis`, this only renames the API at its two call sites (lines 32 and 42); inline `self.postMessage(...)` there instead of keeping the indirection.

# WARN 9ffccd56-7 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/testing/ScriptedLanguageModel.ts:352:14`

`export const scriptedLanguageModelLayer` restates the namespace's own name (`ScriptedLanguageModel`) inside a module marked `@import-as-namespace`; callers already reach it redundantly as `ScriptedLanguageModel.scriptedLanguageModelLayer` (e.g. `AiSummarizer.test.ts:22`, `AiParser.test.ts:586`, `label-mailbox.test.ts:77`). Per `import-as-namespace-is-all-or-nothing`, rename to `layer` (`ScriptedLanguageModel.layer`) and update all call sites, including the destructured import in `ScriptedLanguageModel.test.ts:11`.

# WARN 9ffccd56-8 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/types/index.ts:5:1`

`export * as Memory from './Memory.ts';` treats `Memory.ts` as a namespace module, but the module carries no `@import-as-namespace` directive and, unlike the sibling ECHO types in this same barrel (e.g. `Account`/`Task`, which are genuinely consumed as `Account.Account`), every real consumer imports the class directly — `import { Memory } from '../../types/Memory.ts'` in `skills/memory/skill.test.ts:17`, `operations/save.ts:10`, `operations/definitions.ts:11`, `operations/query.ts:10`, and others — and uses bare `Memory` (e.g. `Obj.make(Memory, ...)`), never the `Memory.Memory` the barrel's namespace form would produce. Per `import-as-namespace-is-all-or-nothing`, this is exactly the disagreement the rule flags: either drop the namespace form here (`export { Memory } from './Memory.ts';`) to match how it's actually used, or add the directive and migrate every call site to `Memory.Memory`.

# WARN 9ffccd56-9 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/ProcessHandle.ts:151:7`

`export class ProcessHandleImpl<I, O, R>` restates the namespace's own name (`ProcessHandle`) inside a module carrying `@import-as-namespace` and barrel-exported as `ProcessHandle`; `ProcessManager.ts` already reaches it redundantly as `ProcessHandle.ProcessHandleImpl` (e.g. lines 349, 444, 689, 748, 773, 881). Per the rule's `Options`/`FooOptions` example, rename to `Impl` and update every `ProcessHandle.ProcessHandleImpl` call site.

# WARN 9ffccd56-10 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/ProcessManager.ts:331:1`

`export interface ProcessManagerImplOpts` and, at line 347, `export class ProcessManagerImpl` both restate the namespace's own name (`ProcessManager`) inside a module that carries `@import-as-namespace` and is barrel-exported as `ProcessManager` — external callers already write `ProcessManager.ProcessManagerImpl` (see `ProcessManager.test.ts:1786` and `QueuedRemoteControl.e2e.test.ts:390`), making the prefix pure redundancy per the rule's own "`Options`, not `FooOptions`" example. Rename to `ImplOpts`/`Impl` (or similar) and update the internal (lines 370, 425, 435, 1092, 1195) and cross-module (`ProcessHandle.ts`) references.

# WARN 9ffccd56-11 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/Trace.ts:23:1`

`export interface TraceWriter` restates the namespace's own name (`Trace`) inside a module carrying `@import-as-namespace` and barrel-exported as `Trace`; it is already reached redundantly as `Trace.TraceWriter` from outside the package (`react-ui-canvas-compute/src/graph/controller.ts:400`, `edge-compute/src/testing/logger.ts:8`). Per the rule's own `Options`/`FooOptions` example, rename to `Writer` (`Trace.Writer`) and update the external references and the internal `noopWriter` typing at line 377.

# WARN 9ffccd56-12 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:258:5`

`await sleep(300);` is used to give `handle.whenReady()` a chance to (incorrectly) resolve before asserting `readyResolved` is still `false`. A fixed real-time sleep is slow and can false-negative under load; prefer racing `whenReady()` against a `Trigger`/`waitForCondition` with a short deterministic yield, or assert via `Promise.race` with an explicit "not yet" check tied to an event the handle actually emits.

# WARN 9ffccd56-13 no-sleep-in-test `packages/core/echo/echo-client/src/feed/feed.test.ts:415:7`

`await sleep(2_500);` is used to let the retrying `appendToFeed` give up before asserting `callCount` stopped at 1. This blind 2.5s wait is both slow and flaky (a slower retry loop would false-negative). Replace it with `waitForCondition` on `callCount` reaching a stable value, or a `Trigger` woken from the mocked `insertIntoFeed` handler once it has been called and the retry path has settled.

# WARN 9ffccd56-14 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:296:9`

`await sleep(100);` is used to give a change made while offline a chance to (incorrectly) propagate before asserting `docOnClient.doc().offlineText` is still `undefined`. Per `no-sleep-in-test`, prefer `waitForCondition`/a `Trigger` tied to the actual replication event instead of a fixed real-time wait to detect an absence.

# WARN 9ffccd56-15 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:381:7`

`await sleep(100);` is used to let sync settle to `'unavailable'` before asserting `progress.peek().state` is not `'ready'`. This is a fixed-duration guess rather than a condition wait; use `waitForQueryState`/`waitForCondition` (already used elsewhere in this same file, e.g. line 394) to wait deterministically for the state to stabilize.

# WARN 9ffccd56-16 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:527:7`

`await sleep(100);` is used to let the just-written change flush to storage before re-opening the repo and reading it back. A real-time sleep to wait out an async storage flush is flaky under load; expose or await the storage-flush completion instead (or poll for it with `waitForCondition`).

# WARN 9ffccd56-17 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:554:7`

`await sleep(100);` immediately precedes `await asyncTimeout(handleB.whenReady(), 1000);`, which already synchronizes with the document becoming ready. The preceding sleep is a redundant fixed-time wait that should be removed; `whenReady()`/`asyncTimeout` is the correct synchronization primitive here per `no-sleep-in-test`.

# WARN 9ffccd56-18 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:582:7`

`await sleep(100);` is used to let the share-config-gated sync settle before asserting the doc body is still empty. As with the other `'unavailable'`/negative-state checks in this file, replace the fixed sleep with `waitForCondition`/`waitForQueryState` on the actual progress state.

# WARN 9ffccd56-19 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:746:9`

`await sleep(100);` is used to give an offline change a chance to (incorrectly) reach `peer2` before asserting `docOnPeer2.doc().offlineText` is undefined. Same pattern as line 296: prefer a condition/event wait over a blind real-time delay.

# WARN 9ffccd56-20 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:805:7`

`await sleep(200);` is used to let sync settle before asserting the doc not in the remote collection stays unsynced (`shouldNotFindDoc.doc()` empty). Replace with `waitForCondition` on the handle's state stabilizing rather than a fixed 200ms guess.

# WARN 9ffccd56-21 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo.test.ts:850:7`

`await sleep(200);` is used the same way as line 805, to let a doc that must not be shared with `peerFromAnotherSpace` settle before asserting it stayed empty. Prefer `waitForCondition` over the fixed real-time wait.

# ERROR 9ffccd56-22 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:346:44`

New test line uses the non-null assertion `firstResult.activity![0]` to index an optional `activity` array with no comment justifying the escape hatch. Since the line directly above already asserts `expect(firstResult.activity).toEqual([...])`, narrow via that expectation's result or an explicit `expect(firstResult.activity?.[0]).toBeDefined()` guard instead of asserting non-null.

# ERROR 9ffccd56-23 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:359:19`

New test line `doc.objects!['obj-1']` non-null-asserts an optional `objects` map inside the `handle.change` callback with no justification. Fix at the source by typing the mutator's `doc` parameter (or a small helper) so `objects` is known non-optional in this test fixture, or use optional chaining with an explicit assertion before the mutation.

# ERROR 9ffccd56-24 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:418:32`

New test line `first.activity![0]` repeats the same unjustified non-null assertion as line 346 on another optional `activity` array; apply the same fix (narrow via the preceding `expect` or an explicit definedness check rather than `!`).

# WARN 9ffccd56-25 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-host/src/query/group-by.test.ts:10:3`

`const at = (iso: string) => Date.parse(iso);` is a describe-local helper whose body is a single unmodified call to the official `Date.parse` API, with no branching, error handling, derived value, or non-trivial default — per `no-trivial-wrappers-over-official-apis` it only renames the API rather than removing duplication, and the reader has to jump to the definition to see that `at('2026-01-05T18:45:12Z')` is just `Date.parse('2026-01-05T18:45:12Z')`. Inline `Date.parse(...)` at each of the six call sites instead.

# WARN 9ffccd56-26 subscribe-where-you-read `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:695:9`

`ChatPrompt` reads `chat?.tasks != null` straight off the `chat` context value to decide whether to show the checklist toggle, with no subscription anywhere on `chat` (unlike `ChatTaskList` in the same file, which calls `useObject(chat)` before reading `chat.tasks`). Per `subscribe-where-you-read`, a task added to a chat that previously had none (or the reverse) will not make the toggle appear/disappear until something unrelated re-renders `ChatPrompt`. Fix by subscribing narrowly, e.g. `const [{ tasks } = {}] = useObject(chat, 'tasks'); const hasTasks = tasks != null;`.

# WARN 9ffccd56-27 no-hand-rolled-lists `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatMcpErrors.tsx:40`

`errors.map(...)` hand-rolls a `<ul>`/`<li>` stack for the list of failed MCP servers instead of a `Listbox` (per `no-hand-rolled-lists`, omit `value`/`onValueChange` since it is a non-selectable `role=list`). This reimplements the theme's row rhythm by hand rather than dropping the errors into `Listbox.Content`/`Listbox.Item`.

# WARN 9ffccd56-28 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:331:5`

`<div className='p-form-chrome space-y-1' ...>` wraps the MCP server rows plus the add-button in a plain padding/spacing box (`no-styling-wrapper-divs`). Use `Flex column gap='xs' asChild` (or `Container`) carrying `p-form-chrome`, rather than a hand-rolled div with `space-y-1`.

# WARN 9ffccd56-29 no-hand-rolled-lists `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:332`

`McpServersPanel` maps `servers` into a hand-rolled `<div>` stack (`servers.map(...)` → `McpServerRow`) instead of a `Listbox`. Sibling settings lists in the same review group — `InvitationsContainer.tsx`, `RecoveryCredentialsContainer.tsx`, `DevicesContainer.tsx` — all wrap the equivalent per-item rows in `Listbox.Root`/`Listbox.Content`/`Listbox.Item`; this panel should follow the same pattern per `no-hand-rolled-lists` instead of re-implementing row layout and spacing from scratch.

# WARN 9ffccd56-30 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:382:5`

`<div className='flex flex-col px-form-chrome' data-testid='assistant.mcp-server'>` is a hand-rolled flex column wrapper (`no-styling-wrapper-divs`). Replace with `Flex column asChild` carrying the `px-form-chrome` padding and the testid.

# WARN 9ffccd56-31 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:383:7`

`<div className='flex items-center gap-2'>` inside `McpServerRow` is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='center' gap='sm'` in its place.

# WARN 9ffccd56-32 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:388:9`

`<div className='flex flex-col flex-1 min-w-0'>` wrapping the server name/url is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column grow` (with `min-w-0` on `classNames`) instead.

# WARN 9ffccd56-33 subscribe-where-you-read `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:389:35`

`McpServerRow` reads `server.name` and `server.url` directly in render (lines 389-390) with no backing subscription for those fields. The component already demonstrates awareness of the failure mode — it calls `useObject(server, 'enabled')` and `useObject(server, 'oauth')` with a comment explaining that `useQuery` "returns live objects but only re-renders on result-identity changes" — but `name`/`url` are read unguarded, so a rename of the server elsewhere will not repaint this row. Add `useObject(server, 'name')`/`'url'` (or extend the existing per-field subscriptions) per `subscribe-where-you-read`.

# WARN 9ffccd56-34 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:75:5`

The root `<div role='group' className='flex flex-col gap-2'>` is a hand-rolled flex column box (`no-styling-wrapper-divs`). Project the layout with `Flex column gap='sm' asChild role='group'` instead of a bare styled div.

# WARN 9ffccd56-35 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:76:7`

`<div className='flex items-center gap-2'>` around the contact picker, role select and add button is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='center' gap='sm'` here.

# WARN 9ffccd56-36 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:115:9`

`<div className='flex gap-2'>` wrapping the join-url field and clipboard button is a hand-rolled flex row (`no-styling-wrapper-divs`). Replace with `Flex gap='sm'`.

# WARN 9ffccd56-37 write-through-the-live-object `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:41:3`

`displayName`, `emoji` and `hue` (lines 41-43) are seeded from `identity` with a bare `useState(identity?.displayName ?? '')` and never resynced — there is no effect (or `useControlledState`/`useControllableState`) that copies `identity`'s current value back in when it changes. This is the "copy one reactive value into local state" anti-pattern the rule calls out: if the identity's `displayName`/`emoji`/`hue` change from elsewhere (another device, another session) while this component is mounted, the form keeps showing the stale value it captured at mount instead of following the live identity. Derive the displayed value from `identity` directly (falling back to the locally-typed draft only while the field has unsaved edits), or resync with an effect/`useControlledState` the way `FunctionBinding`'s `binding` field does.

# WARN 9ffccd56-38 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:62:7`

`<div className='grid grid-cols-4' data-testid='recoveryCode.code' ...>` lays the recovery-code words out with a hand-rolled grid (`no-styling-wrapper-divs`). Use `Grid cols={4}` (or the list form) instead of a bare `grid grid-cols-4` div.

# WARN 9ffccd56-39 no-hand-rolled-lists `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:155`

`TestLauncher` maps `LAUNCHER_MESSAGES` into plain `<button>` rows and hand-tracks the "current" row via local `selected` state and a `data-selected` attribute. This is exactly the pattern `no-hand-rolled-lists` flags — a mapped stack of row elements re-implementing selection state — and should be a `Listbox` (single-select) instead.

# WARN 9ffccd56-40 subscribe-where-you-read `packages/plugins/plugin-github/src/containers/PullRequestArticle/PullRequestArticle.tsx:80:31`

`PullRequestArticle` is a surface receiving `AppSurface.ObjectArticleProps<PullRequest.PullRequest>`, which the rule calls out explicitly, yet it never subscribes to `pullRequest` (no `useObject(pullRequest)` anywhere in the file). It reads `pullRequest.state` (line 80), `pullRequest.url` (lines 254, 418, 422, 429, 446), `pullRequest.headBranch`/`pullRequest.baseBranch` (lines 462-463) and `pullRequest.description` (line 500) directly in render/memo bodies. A state change made elsewhere (e.g. the PR merging, or its branches/description changing) will not repaint this article until an unrelated re-render occurs. Fix by adding `const [subject] = useObject(pullRequest);` and reading the subscribed snapshot's fields instead of the raw prop.

# WARN 9ffccd56-41 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:63:15`

`<div className='flex flex-col gap-3 p-3 text-sm' data-testid='illustrator.scores'>` is a hand-rolled flex column with padding (`no-styling-wrapper-divs`). Replace with `Flex column gap='md' asChild` carrying the padding and testid.

# WARN 9ffccd56-42 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:64:17`

`<div className='flex items-baseline gap-2'>` around the overall score is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='baseline' gap='sm'`.

# WARN 9ffccd56-43 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:83:23`

`<div className='flex items-center gap-2'>` inside each score row is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='center' gap='sm'`.

# WARN 9ffccd56-44 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/ImportSpaceDialog/ImportSpaceDialog.tsx:70:11`

The new importing-status `<div role='status' className='... flex items-center justify-center gap-2'>` is a hand-rolled flex box (`no-styling-wrapper-divs`). Use `Flex align='center' justify='center' gap='sm' asChild role='status'` carrying the border/padding classes instead.

# WARN 9ffccd56-45 subscribe-where-you-read `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:51:19`

`TableArticle` receives `subject: object` as `AppSurface.ObjectArticleProps<Table.Table>` and reads `object.view` directly (line 51) to derive `queryAst`/`schema`, with no subscription established on `object` itself (only the resolved ref's target is subscribed via `useObject(object.view)`). If the table's `view` field is ever reassigned to a different ref, the component will not notice and will keep rendering the old view's columns/query. Subscribe to the field being read, e.g. `const [{ view } = {}] = useObject(object, 'view'); const [resolvedView] = useObject(view);`, per `subscribe-where-you-read`.

# WARN 9ffccd56-46 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArtifacts.tsx:34`

`refs.map(...)` hand-rolls a vertical stack of full-width `Card.Root` elements for a task's artifacts. The same "objects as cards" case is already covered by the `Masonry`-based primitive used elsewhere in this review group (`CardMasonry.tsx`, whose own docstring names "a task's artifacts" as its motivating example, and `RelatedCards.tsx`). Per `no-hand-rolled-lists`, this should render through that existing primitive rather than mapping `Card.Root` by hand in a plain `<section>`.

# WARN 9ffccd56-47 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:201:7`

`<div className='px-trim-md'>` was added purely to carry padding around `TaskList.Edit` (`no-styling-wrapper-divs`). Use `Container` (it merely fills the parent and takes `asChild`) with the padding classes, or apply the padding through `TaskList.Edit`'s own `classNames`, instead of a bare wrapper div.

# WARN 9ffccd56-48 toolbars-are-menu-actions `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:175`

`TranscriptTabs`' inner toolbar (`Panel.Toolbar` / `Toolbar.Root`, rendered beside the `Tabs.Tablist`) renders a hardcoded `IconButton` for "regenerate" directly, with its busy/disabled state (`isSummarizing`, `isRegenerateDisabled`) wired by hand via props rather than through `MenuBuilder`/`useMenuActions`, and the `Toolbar.Root` is not given `attendableId` (unlike the article's outer `ActionToolbar`, which correctly threads `attendableId` and uses `MenuBuilder`). Per `toolbars-are-menu-actions`, this closes the sub-toolbar to plugin composition — a contributed action or a graph action targeting this surface has nowhere to land. Fix by building the regenerate action (and the tab switches, if kept in the same toolbar) with `MenuBuilder` inside an `Atom`/`useMenuActions`, encoding `disabled` and the busy/idle icon swap in the action's properties, and pass `attendableId` through so attention-driven contributions target the right surface.

# WARN 9ffccd56-49 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:234`

`EdgeAgentManagerLayer`'s own signature declares `Layer.Layer<EdgeAgentManagerService, never, Hook.Controller | SpacesContract.ManagerService | IdentityContract.ProviderService>` — `EdgeHttpClientService` is not among the requirements — yet the body does `yield* Effect.serviceOption(EdgeHttpClientService)` expecting it to sometimes resolve. `EdgeAgentManagerSpec` in `layer-specs.ts` compounds this: its `requires` is the fixed `[Hook.Controller, SpacesContract.ManagerService, IdentityContract.ProviderService]`, never including the edge tag even when `options.edgeAvailable`. Per `declare-optional-services-with-noop-layers`, a tag a `LayerSpec` does not require is never in its context, so this `serviceOption` read comes back `None` unconditionally — `_edgeHttpClient` is always `undefined` and `_open()`'s `isEnabled` check is permanently false, silently disabling EDGE agent creation even in an edge-configured app. Fix: add `EdgeHttpClientService` to `EdgeAgentManagerLayer`'s declared requirements and to `EdgeAgentManagerSpec`'s `requires` (conditioned on `options.edgeAvailable`, matching the pattern `InboxServiceSpec` already uses), and satisfy it with a documented `layerNoop` on hosts without an edge endpoint instead of reading it optionally.

# WARN 9ffccd56-50 no-sleep-in-test `packages/sdk/client-services/src/internal/invitations/invitations-handler.test.ts:185:11`

`while (!guest.ctx.disposed) { await failCodeInput(...); await sleep(10); }` is a busy-poll loop with a `sleep` between iterations — the exact pattern `no-sleep-in-test` prohibits. Use `waitForCondition` (already imported and used elsewhere in this file) around the retry, or drive the loop from an event/`Trigger` that fires on each failed attempt instead of polling on a timer.

# WARN 9ffccd56-51 no-sleep-in-test `packages/sdk/client-services/src/internal/invitations/invitations-handler.test.ts:259:9`

`await sleep(40);` after `waitForCondition` finds one guest has succeeded is used to let the other guests' auth attempts finish failing before asserting only one succeeded. This fixed-duration guess can flake if the other attempts take longer; replace it with `waitForCondition` on all guests reaching a terminal state (`SUCCESS` or `ERROR`).

# WARN 9ffccd56-52 no-sleep-in-test `packages/sdk/client-services/src/internal/invitations/invitations-handler.test.ts:389:7`

`await sleep(30);` in `createNewHost`, between a completed `performAuth` and calling `hostInvitation`, is an unexplained fixed-time buffer. Replace with a condition/event wait tied to whatever state `hostInvitation` actually needs to observe, per `no-sleep-in-test`.

# WARN 9ffccd56-53 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:647`

`InvitationsHandlerLayer` is explicitly typed `Layer.Layer<InvitationsHandlerService, never, SwarmNetworkManagerService>` — `EdgeHttpClientService` is excluded from the requirements — but the body reads `yield* Effect.serviceOption(EdgeHttpClientService)` to obtain `_edgeClient`. `InvitationsHandlerSpec` in `layer-specs.ts` never requires the edge tag either (unlike `InboxServiceSpec`, which conditionally adds `EdgeHttpClientService`/`EdgeConnectionService` to its `requires` when `options.edgeAvailable`). Per `declare-optional-services-with-noop-layers`, this makes the tag permanently absent from the layer's context, so `_edgeClient` is always `undefined` and `EdgeInvitationHandler` never gets a live client — edge-delegated invitation admission is silently dead code regardless of whether EDGE is configured. Fix: declare `EdgeHttpClientService` as a requirement (conditionally, alongside `InboxServiceSpec`'s pattern) and supply a `layerNoop` where no edge endpoint exists, rather than reading it via `serviceOption`.

# WARN 9ffccd56-54 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/layer-specs.ts:388`

`InvitationsHandlerSpec`'s `requires: [SwarmNetworkManagerService]` never includes `EdgeHttpClientService`, even when `options.edgeAvailable` — unlike `InboxServiceSpec` a few lines below (line 605), which correctly conditions `requires` on `options.edgeAvailable` for the same tag. Since the wrapped `InvitationsHandlerLayer` reads `EdgeHttpClientService` with `Effect.serviceOption`, and per this rule a tag the spec does not require is never in its layer's context, the read always comes back empty and edge-assisted invitation handling never activates. Declare the tag in `requires` (conditionally, as `InboxServiceSpec` does) rather than leaving the optional read to silently no-op.

# WARN 9ffccd56-55 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/layer-specs.ts:456`

`EdgeAgentManagerSpec`'s `requires: [Hook.Controller, SpacesContract.ManagerService, IdentityContract.ProviderService]` never includes `EdgeHttpClientService`, even when `options.edgeAvailable`, unlike the correctly-conditioned `InboxServiceSpec` pattern in the same file. The wrapped `EdgeAgentManagerLayer` reads `EdgeHttpClientService` via `Effect.serviceOption`, so per this rule the tag is never in the spec's context and the read always comes back empty — EDGE agent creation/status is unreachable in every host, including ones with EDGE configured. Declare the tag in `requires` (conditionally on `options.edgeAvailable`) instead of relying on the optional read.

# WARN 9ffccd56-56 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:220:5`

The scorecard root `<div className='flex flex-col gap-4 p-3 overflow-y-auto text-sm border-l border-separator' ...>` is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column gap='lg' asChild` carrying the padding/border/scroll classes.

# WARN 9ffccd56-57 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:225:9`

`<div className='flex items-baseline gap-2'>` around the total score is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='baseline' gap='sm'`.

# WARN 9ffccd56-58 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:244:13`

Each score row `<div className='grid grid-cols-[5.5rem_1fr_3rem_2.5rem] items-center gap-2 text-xs' ...>` is a hand-rolled grid (`no-styling-wrapper-divs`). Use `Grid cols={['5.5rem','1fr','3rem','2.5rem']} gap='sm'` instead of a bare grid div.

# WARN 9ffccd56-59 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:274:9`

`<div className='grid grid-cols-[1fr_auto] gap-x-4 font-mono text-xs'>` in the Metrics section is a hand-rolled grid (`no-styling-wrapper-divs`). Use `Grid cols={['1fr','auto']} gap='lg'`.

# WARN 9ffccd56-60 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:308:5`

The two-pane `<div className='dx-fill grid grid-cols-[1fr_24rem]'>` layout is a hand-rolled grid (`no-styling-wrapper-divs`). Use `Grid cols={['1fr','24rem']} asChild` (with `Container`/`dx-fill` as needed) instead.

# WARN 9ffccd56-61 no-hand-rolled-lists `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:86`

The activity log is a hand-built `role='list'`/`role='listitem'` grid (`visible.map(...)`) rather than the `Listbox` primitive (headless, `role=list` with no `value`/`onValueChange` for this non-selectable case). Per `no-hand-rolled-lists`, a flat display list like this belongs on `Listbox.Content`/`Listbox.Item` so the row rhythm and semantics come from the shared primitive instead of being re-derived here.

# WARN 9ffccd56-62 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:428:9`

The new `<div className='col-[title/chips-end] row-start-2 flex min-w-0 flex-col gap-2 pb-1'>` stacking the description and questions is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column gap='sm' asChild` carrying the grid-placement classes (`col-[...]`, `row-start-2`) via `classNames`.

# WARN 9ffccd56-63 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:69:5`

The component root `<div role='group' ... className={mx('flex flex-col gap-1 text-sm', classNames)} ...>` is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column gap='xs' asChild role='group'` carrying the event handlers and testid.

# WARN 9ffccd56-64 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:78:7`

`<div className='flex items-start gap-2'>` around the question icon/text is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='start' gap='sm'`.

# WARN 9ffccd56-65 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:88:9`

The answer `<div className='flex items-start gap-2' data-testid='task-question.answer'>` is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex align='start' gap='sm'`.

# WARN 9ffccd56-66 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:94:11`

`<div className='flex flex-col gap-1 ps-6'>` around the answer options is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column gap='xs'` with the `ps-6` indent on `classNames`.

# WARN 9ffccd56-67 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:107:17`

`<div className='grow min-w-0 flex flex-col gap-0.5 text-start'>` inside each option button is a hand-rolled flex column (`no-styling-wrapper-divs`). Use `Flex column grow gap='xs'`.

# WARN 9ffccd56-68 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:117:13`

`<div className='flex flex-wrap gap-1'>` wrapping the free-form field and submit button is a hand-rolled flex row (`no-styling-wrapper-divs`). Use `Flex wrap gap='xs'`.

# WARN 9ffccd56-69 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:26:7`

The new centering `<div className='grid place-items-center w-screen h-screen'>` is a hand-rolled grid box (`no-styling-wrapper-divs`). Use `Grid` (or `Flex align='center' justify='center'`) with `asChild` instead of a bare `grid place-items-center` div.
