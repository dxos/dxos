# Progress Monitor Capability — Design

- **Date:** 2026-07-11
- **Status:** Approved (design)
- **Worktree/branch:** `claude/progress-monitor-capability-649e87`

## Problem

Plugins run background work (e.g. `plugin-inbox` Gmail sync) whose progress is
invisible to the UI. There is no shared way for a plugin to *provide* progress
and for a surface (an article, a toolbar/rail button) to *subscribe* and show
it. Separately, `@dxos/pipeline` already defines a `Progress` mechanism
(`Progress.ts` / `ProgressReporter.ts`) with nearly the shape we need
(`current`/`total`/`elapsedMs`, `subscribe`/`snapshot`). We want one common
mechanism rather than two parallel definitions.

## Goals

- `@dxos/app-toolkit` surfaces a capability that lets plugins **provide** and
  **subscribe to** progress monitors.
- A **registry** of progress providers, each of which **exposes an atom**.
- Each provider reports: **current count, expected total, elapsed time, time
  estimate**, plus a **display name**.
- `plugin-inbox`'s sync operation provides a monitor; `MailboxArticle` shows a
  **progress meter**; an **R0 rail button** opens a **popover** listing all
  active providers.
- **Reconcile** with `@dxos/pipeline`'s `Progress` so both share a common core.

## Non-goals (YAGNI)

- No persistence, cross-tab sync, or progress history.
- No cancellation/abort control surface.
- No per-task breakdown in the app registry beyond the aggregate monitor.

## Decisions (from brainstorming)

1. **Availability:** the registry is always present (contributed by an
   always-loaded host), not devtools-only like `StatsPanel`.
2. **Provider lifecycle:** **dynamic per-task registration** — register on start,
   mutate while running, remove on finish. Multiple concurrent, keyed by `id`.
3. **Reconciliation:** **extract the shared core** into a new leaf package;
   both `@dxos/pipeline` and `@dxos/app-toolkit` consume it.
4. **ETA:** **producer-supplied** (`estimatedMs`); the registry falls back to a
   naive linear estimate when absent and `total` is known.

## Architecture

Four units, each independently understandable and testable:

```
@dxos/progress (leaf, pure)          ← types + makeRegistry() + deriveEta()
   ├── @dxos/pipeline  (Progress Tag / ProgressReporter delegate to it)
   └── @dxos/app-toolkit
         ├── AppCapabilities.ProgressRegistry   (atom-backed wrapper)
         ├── ui/hooks: useProgress, useProgressMonitors
         └── ui: <ProgressMeter/>                (reusable, no plugin dep)
plugin-progress (always-on host, private)
   ├── contributes ProgressRegistry capability
   └── contributes AppSurface.StatusIndicator → <ProgressStatusIndicator/>
plugin-inbox
   ├── runGmailSync registers a monitor
   └── MailboxArticle subscribes → <ProgressMeter/>
```

### 1. `@dxos/progress` — shared core (new leaf package, `private: true`)

Pure, framework-free primitives extracted from `@dxos/pipeline`'s `Progress.ts`.
Only dependency: `@dxos/log`.

```ts
export type ProgressStatus = 'pending' | 'running' | 'done' | 'error';

/** Live progress for one registry entry (one task/monitor). */
export type ProgressState = {
  readonly id: string;
  /** Human display name — shown in the meter and the rail popover. */
  readonly name: string;
  readonly current: number;
  readonly total?: number;
  readonly status: ProgressStatus;
  readonly startedAt?: string;      // ISO
  readonly updatedAt: string;       // ISO
  readonly elapsedMs?: number;      // snapshot of elapsed at updatedAt
  readonly estimatedMs?: number;    // producer-supplied remaining-time estimate
  readonly note?: string;
  readonly error?: string;
};

export type ProgressSnapshot = {
  readonly updatedAt: string;
  readonly entries: readonly ProgressState[];
};

/** Handle for one entry; returned by register(). */
export interface ProgressMonitor {
  readonly id: string;
  readonly set: (current: number) => void;
  readonly advance: (by?: number) => void;   // default 1
  readonly total: (total: number) => void;
  readonly estimate: (remainingMs: number) => void;
  readonly note: (text: string) => void;
  readonly done: () => void;
  readonly fail: (error: string) => void;
  readonly remove: () => void;                // drop from the registry
}

export interface ProgressRegistryApi {
  readonly register: (id: string, options: { name: string; total?: number }) => ProgressMonitor;
  readonly snapshot: () => ProgressSnapshot;
  readonly subscribe: (listener: (snapshot: ProgressSnapshot) => void) => () => void;
}

export const makeRegistry = (): ProgressRegistryApi => { /* map + listeners + emit */ };

/** Producer estimate if present, else linear elapsedMs/current × (total−current); undefined if unknowable. */
export const deriveEta = (state: ProgressState): number | undefined => { /* ... */ };
```

`elapsedMs` is snapshotted on each mutation (as pipeline already does); a live
UI may recompute from `startedAt`. `deriveEta` returns `estimatedMs` when the
producer supplied it, else a linear estimate when `total` and `current > 0` are
known, else `undefined`.

**Pipeline delegation.** `@dxos/pipeline`'s `Progress` `Context.Tag` and
`ProgressReporter` keep their exact public surface (`task`/`seed`/`snapshot`/
`subscribe`, the `logSink`/`layer`) but delegate to `makeRegistry()`:
`Progress.task(name, opts)` maps onto `register(name, { name, ... })`. This adds
the `estimatedMs` field and a `remove()`/`estimate()` path; no behavior change
for existing pipeline callers. `@dxos/pipeline` gains a `workspace:*` dependency
on `@dxos/progress`.

### 2. `AppCapabilities.ProgressRegistry` — atom-backed registry (app-toolkit)

An atom-backed wrapper over one `makeRegistry()` instance, mirroring the
single-atom-of-record pattern of `StatsPanel` (`AppCapabilities.ts`). The
internal writable atom holds the current `ProgressSnapshot`; producer mutations
`registry.set(...)` a new snapshot; consumers read reactively.

```ts
export type ProgressRegistry = Readonly<{
  /** Aggregate snapshot of all entries — for the rail popover / union UIs. */
  snapshotAtom: Atom.Atom<ProgressSnapshot>;
  /** Per-provider atom (derived selector) — "the provider exposes an atom". */
  entryAtom: (id: string) => Atom.Atom<ProgressState | undefined>;
  /** Producer side: register a new monitor. */
  register: (id: string, options: { name: string; total?: number }) => ProgressMonitor;
  snapshot: () => ProgressSnapshot;
}>;

export const ProgressRegistry =
  Capability$.make<ProgressRegistry>('org.dxos.app-toolkit.capability.progressRegistry');
```

- `entryAtom(id)` is a memoized `Atom.map(snapshotAtom, s => s.entries.find(e => e.id === id))`.
- Producers resolve it with `Capability.get(AppCapabilities.ProgressRegistry)`
  (always present — see host), then `register(...)` and mutate the handle. The
  monitor handle mutations drive `registry.set(snapshotAtom, nextSnapshot)`.

### 3. React hooks (`@dxos/app-toolkit` `ui/hooks`)

Mirror `useLayout` / `useAtomCapability`:

```ts
/** Aggregate — subscribes snapshotAtom (for the rail indicator/popover). */
export const useProgressMonitors = (): readonly ProgressState[] => { ... };
/** One monitor by id — subscribes entryAtom(id) (for MailboxArticle). */
export const useProgress = (id: string): ProgressState | undefined => { ... };
```

### 3a. UI components

- **`<ProgressMeter state={ProgressState} />`** in `@dxos/app-toolkit/ui`
  (reusable; no plugin dependency, so `plugin-inbox` can use it without
  depending on `plugin-progress`). A themed bar: determinate on
  `current/total`, indeterminate when `total` is undefined; renders `name`,
  `current`/`total`, live elapsed, and ETA via `deriveEta`. Uses theme tokens
  and `@dxos/react-ui` primitives (no new design-system primitive introduced).
- **`<ProgressStatusIndicator/>`** in `plugin-progress`. Contributed as an
  `AppSurface.StatusIndicator` react-surface — the R0 complementary-sidebar rail
  already renders this role (`ComplementarySidebar.tsx:121`). Shows an icon with
  an active-count badge; hidden when no monitors are active. On click, a
  `Popover` (`side='left'`, mirroring `plugin-space`'s `SyncStatus`) lists all
  active providers, one `<ProgressMeter/>` row each. Reads
  `useProgressMonitors()`.

### 4. Host: `plugin-progress` (new, always-on, `private: true`)

Small plugin, always loaded (like the base plugins), that:
- contributes `AppCapabilities.ProgressRegistry` (a capability module that
  builds the atom-backed registry from `Capabilities.AtomRegistry`, kept alive
  with `Atom.keepAlive` so a background writer can populate it before any
  surface subscribes — as `StatsPanel` does);
- contributes the `AppSurface.StatusIndicator` react-surface rendering
  `<ProgressStatusIndicator/>`.

*Open implementation detail (does not affect the interface):* the host may
instead be folded into an existing always-loaded base plugin rather than a new
package. Recommendation is the dedicated `plugin-progress` for isolation.

### 5. Pipeline bridge (secondary/optional)

A thin `toProgressLayer(monitor: ProgressMonitor)` in `@dxos/app-toolkit` yields
a `@dxos/pipeline` `Progress` layer bound to one registry monitor, so a pipeline
run's task updates aggregate into a single app-registry entry (sum of task
`current`/`total`). Not required by the inbox demo — the inbox operation drives
its monitor directly.

### 6. Motivating wiring — `plugin-inbox`

- **`runGmailSync`** (`operations/google/gmail/sync.ts`): resolve
  `Capability.get(AppCapabilities.ProgressRegistry)`, `register` a monitor keyed
  by mailbox URI with a display `name` (mailbox label, e.g. `"Syncing <name>"`).
  Set `total` from the listed message-id count once known; `advance` per
  committed page (reusing the existing `processed` / `stats.newMessages`
  counters); `done()` then `remove()` at the end (and `fail()` on error). No
  `estimatedMs` initially → linear fallback.
- **`MailboxArticle`**: `useProgress(mailboxUri)` and render `<ProgressMeter/>`
  inline, shown only while a monitor is active.

## Data flow

```
runGmailSync ─register/advance─▶ ProgressRegistry (writable snapshot atom)
                                        │  set(snapshotAtom, next)
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼ entryAtom(mailboxUri)          ▼ snapshotAtom                    
  MailboxArticle <ProgressMeter/>   ProgressStatusIndicator (R0 popover)
```

## Error handling

- `fail(error)` sets `status: 'error'` + `error`; the meter shows the error
  state; the entry stays until `remove()` (so a failed sync remains visible).
- On error the producer marks the monitor `fail()` and leaves it visible until a
  later run replaces it or the surface unmounts; on success it `done()`s then
  `remove()`s the transient monitor.
- Although the registry is always present in the app, producers resolve it with
  `Capability.getAll(...)` (no-op when absent) so operations run unchanged in
  headless/test contexts — matching the `StatsPanel` usage already in the sync
  operation. UI consumers, which only run inside the app, use `Capability.get`
  via the hooks.

## Testing

- **`@dxos/progress`:** unit — `makeRegistry` (register/advance/total/remove/
  subscribe emits), `deriveEta` (producer value vs. linear fallback vs.
  unknown-total → undefined).
- **`@dxos/pipeline`:** existing `Progress.test.ts` stays green (delegation).
- **`@dxos/app-toolkit`:** registry capability — register → `snapshotAtom` and
  `entryAtom(id)` update; `remove` drops the entry; `entryAtom` isolation
  between two ids.
- **`plugin-inbox`:** sync test asserts a monitor is registered with a name,
  advances, and is removed at completion (extend the existing sync test harness
  with a stub/real `ProgressRegistry`).
- **UI:** `ProgressMeter` and `ProgressStatusIndicator` stories in storybook
  (determinate, indeterminate, error, multi-provider popover).

## Migration / compatibility

- No compatibility shims. `@dxos/pipeline`'s public API is preserved by
  delegation; if any internal type moves to `@dxos/progress`, all call sites are
  updated in the same change.
- New packages set `"private": true`; in-repo deps use `workspace:*`.
