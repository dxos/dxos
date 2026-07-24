# Design: `@dxos/react-ui-debug` log panel + `plugin-debug` R0 surface

Date: 2026-07-23
Branch: `claude/react-ui-debug-panel-55b37f`

## Problem

Opening Chrome DevTools tanks app performance, especially during active
debugging where all we need is a live view of `@dxos/log` output. We want an
in-app logging panel that captures the log stream, is filterable, resettable,
level-configurable, and copyable to the clipboard — no DevTools required.

## Goals

- A reusable, DevTools-free view of the live `@dxos/log` stream, embeddable in
  any app or storybook.
- Rolling (bounded) buffer that captures **every** entry regardless of the
  active console filter — the point is to avoid DevTools, so we must not lose
  DEBUG lines the console would drop.
- Toolbar: filter (level + text), reset (clear), configure logging level, copy
  to clipboard.
- Wire it into Composer via the existing `plugin-debug` as an R0 button +
  popover and a companion panel.

## Non-goals

- Persisting logs across reloads (the IndexedDB `@dxos/log-store-idb` already
  covers durable capture; this panel is a live, in-memory view).
- Replacing `app.log` / NDJSON file capture or `query-logs`.
- Server/Node log capture — this is a browser UI concern.

## Architecture

Two units with a clean boundary:

### 1. `@dxos/react-ui-debug` (new, private package, `packages/ui/react-ui-debug`)

Headless store + presentational component. No app-framework or plugin deps.

**`LogStore`** — a small class wrapping a ring buffer of captured records.
- Registers a `LogProcessor` via `log.addProcessor(processor)` and keeps the
  returned unsubscribe handle. The processor captures **unconditionally** (it
  does not consult `shouldLog`), so the buffer holds everything the app logs.
- Ring buffer with a fixed `capacity` (default 1000); oldest entries drop.
- Derives a plain, serialization-friendly record per entry from `LogEntry`
  (`timestamp`, `level`, `message`, `computedContext`, `computedError`,
  `computedMeta.filename`/`line`/`context`) so the UI never holds live
  `LogEntry` getters.
- Reactive: exposes `subscribe(cb)` + `getSnapshot()` for React
  `useSyncExternalStore` (no effect-atom dependency).
- API: `start()` / `stop()` (idempotent register/unregister), `clear()`,
  `entries` snapshot, `capacity`.
- A module-level default singleton (`logStore`) that starts capture on import,
  so consumers (the plugin) capture from activation without wiring a processor
  themselves. Explicit `createLogStore({ capacity })` is also exported for
  isolated use (storybook, tests).

**`<LogPanel>`** — presentational, built from `@dxos/react-ui` primitives and
`@dxos/ui-theme` tokens (per `composer-ui`). Props: `store?` (defaults to the
singleton), `classNames`.
- **Toolbar** (`@dxos/react-ui` Toolbar + IconButton):
  - **Level `Select`** — sets the display threshold AND calls
    `log.config({ filter: <level> })` so the global console/logging level tracks
    the panel. Capture is unaffected (processor ignores filters), so raising the
    level never loses buffered lines; the display re-filters live.
  - **Text filter** `Input` — substring match over message + file path +
    context.
  - **Reset** IconButton — `store.clear()`.
  - **Copy** IconButton — serialize visible (filtered) entries to text and
    `navigator.clipboard.writeText`.
  - **Autoscroll/pause** toggle IconButton — pause pins the scroll position;
    resume sticks to the tail.
- **List** — rolling, newest at the bottom, autoscrolls to tail unless paused.
  Each row is **compact** (timestamp · level badge · `file:line` · message);
  clicking a row **expands** its `context`/`error` JSON inline. Level badge
  colored via theme tones (map WARN/ERROR to the warning/error tones).
- Empty state when the buffer is empty.
- `translations.ts` with a namespace for all labels; storybook story that emits
  synthetic `log.info`/`warn`/`error` lines to drive the panel.

Package shape mirrors `@dxos/react-ui-card`: `moon.yml`
(`ts-vite-build`/`ts-test`/`ts-test-storybook`/`pack`/`storybook`),
`package.json` with `"private": true`, `src/{components,index.ts,translations.ts}`,
`.storybook/`, `vite.config.ts`, `tsconfig.json`. Deps: `@dxos/log`,
`@dxos/react-ui`, `@dxos/ui-theme`, `@dxos/util`, `@dxos/react-ui-syntax-highlighter`
(for expanded JSON, optional). Dev: `@dxos/storybook-utils`, react, vite.

### 2. `plugin-debug` (existing) — R0 wiring

Reuse the panel; add capture-from-startup + two surfaces.

- Add `@dxos/react-ui-debug` (`workspace:*`) dep; import the singleton `logStore`
  (import side-effect starts capture at plugin activation).
- **Companion panel (R0)**: `app-graph-builder.ts` adds
  `AppNode.makeDeckCompanion({ id: 'logs', label, icon: 'ph--list-magnifying-glass--regular', data: 'logs' })`
  (mirrors the existing `spaceObjects` companion). `react-surface.tsx` adds a
  `Surface` with `filter: Surface.makeFilter(AppSurface.deckCompanion('logs'))`
  rendering `<LogPanel />`. This is the "R0 button" (companion tab button in the
  R0 strip) + full companion panel.
- **Popover quick-view**: a status-bar surface
  (`filter: AppSurface.StatusIndicator`, like `DebugStatus`) rendering a small
  button (log/error count) that opens `<LogPanel>` in a `@dxos/react-ui`
  `Popover` for a glance without switching the companion.
- Add translation keys for the new labels; register in `translations.ts`.

## Data flow

`log('…', ctx)` → `processLog` runs **all** processors →
`LogStore` processor pushes a derived record into the ring buffer → `subscribe`
notifies → `<LogPanel>` re-renders via `useSyncExternalStore`, applying the
level + text display filter. Level `Select` change → `log.config({ filter })`
(console threshold) + display threshold state.

## Error handling / edge cases

- Clipboard: guard `navigator.clipboard` absence; surface a toast/inline note on
  failure (no throw).
- Capacity overflow: ring buffer drops oldest silently; buffer count shown so
  truncation is visible.
- High log volume: cap re-render rate — coalesce processor pushes into a batched
  notify (e.g. microtask/animation-frame flush) so a burst doesn't thrash React.
- Function-valued contexts are resolved by `LogEntry.computedContext`; the store
  only keeps the computed record, never the raw closure.
- Idempotent `start()`/`stop()`; `addProcessor` already dedups identical
  processor refs.

## Testing

- `react-ui-debug`: unit tests for `LogStore` — capture appends, ring-buffer
  eviction at capacity, `clear()`, subscribe/notify, start/stop unregisters the
  processor. Drive via real `log.info(...)` calls.
- Storybook story renders `<LogPanel>` with a button that emits sample lines;
  verify visually + `ts-test-storybook`.
- `plugin-debug`: existing `DebugPlugin.test.ts` continues to pass; the new
  surfaces are thin.

## Open questions (resolved)

- Level control → **sets global filter** (`log.config`) in addition to display
  filter.
- plugin-debug surface → **both** R0 button + popover (status indicator) and R0
  companion panel.
- Row detail → **compact with click-to-expand**.
