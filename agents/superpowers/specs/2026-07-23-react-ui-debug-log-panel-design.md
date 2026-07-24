# Design: `@dxos/react-ui-debug` log panel + reuse across devtools & plugin-debug

Date: 2026-07-23
Branch: `claude/react-ui-debug-panel-55b37f`

## Problem

Opening Chrome DevTools tanks app performance, especially during active
debugging where all we need is a live view of `@dxos/log` output. We want an
in-app logging panel that captures the log stream, is filterable, resettable,
level-configurable, and copyable to the clipboard — no DevTools required.

An implementation already exists:
`packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx`.
It is a good base (filter via `log.config`, per-row copy, level colors,
`shortLevelName`) but is trapped inside the devtools `Panel` wrapper and has two
limits: it keeps the *oldest* `maxLines` (`slice(0, maxLines)`) and only records
behind an `active` switch. We **factor it out** into a reusable
`@dxos/react-ui-debug` component, fix the buffer, and consume it from both
devtools and a new `plugin-debug` R0 surface.

## Goals

- A reusable, DevTools-free `<LogPanel>` embeddable in any app or storybook.
- Rolling (bounded) buffer keeping the **most recent** N lines.
- Toolbar: filter (LOG_FILTER syntax), configure logging level, record/pause,
  reset, copy-to-clipboard (all visible + per-row).
- Reuse it from the existing devtools performance panel and from `plugin-debug`
  as an R0 button + popover and a companion panel.
- Additionally, reimplement the devtools performance `Panel.tsx` on top of the
  `@dxos/react-ui` `Panel` primitive (keeping its public API).

## Non-goals

- Persisting logs across reloads (durable capture is `@dxos/log-store-idb`).
- Replacing the RPC/service-backed `panels/client/LoggingPanel` (different data
  source — the client `LoggingService` stream).
- Replacing `app.log` / NDJSON file capture or `query-logs`.

## Decisions (approved)

- **Capture model:** reuse the existing **gated** approach —
  `log.config({ filter })` + `shouldLog(entry, config.filters)`, capturing only
  while the panel is mounted and recording. Cheap; matches proven code. Each
  mount owns its own component-local rolling buffer (no always-on singleton).
- **Level control:** the filter drives the global config, so it also sets the
  global logging level. A level `Select` is a shortcut that writes a bare level
  (`info`, `debug`, …) into the filter; the free-text filter supports the full
  LOG_FILTER `path:level` syntax for scoping.
- **Rows:** compact (level letter · file · message) with click-to-expand
  context/error, plus a per-row copy affordance.
- **plugin-debug surface:** both an R0 button + `Popover` (status indicator) and
  an R0 **companion** panel.
- **Panel refactor:** include now — rebuild `Panel.tsx` internals on the
  `@dxos/react-ui` `Panel` primitive, preserving its external props so all ~10
  consumers are unaffected.

## Architecture

### 1. `@dxos/react-ui-debug` (new, private, `packages/ui/react-ui-debug`)

Presentational, self-contained. Deps: `@dxos/log`, `@dxos/react-ui`,
`@dxos/ui-theme`. No app-framework/devtools deps.

- **`<LogPanel>`** — factored + enhanced from the devtools `LoggingPanel`.
  - Props (`ThemedClassName`): `maxLines?` (default 1000), `initialFilter?`
    (default `'info'`), `defaultRecording?` (default `true`).
  - Layout via the `@dxos/react-ui` `Panel` primitive (`Panel.Root` +
    `Panel.Toolbar` + `Panel.Content` scroll body).
  - Toolbar: filter `Input` (LOG_FILTER syntax) → `log.config({ filter })`;
    level `Select` (trace…error) that writes a bare level into the filter;
    record/pause toggle; reset (clear); copy-all `IconButton`.
  - Capture effect (only while recording): `log.config({ filter })` +
    `log.addProcessor((config, entry) => shouldLog(entry, config.filters) &&
    setEntries((prev) => [...prev, entry].slice(-maxLines)))`, disposing on
    cleanup. Note: keeps **most recent** lines (fixes the `slice(0, …)` bug).
  - Rows: compact colored level letter (`text-{error,warning,info,success}-text`
    per the existing thresholds) · short file · message; click toggles an
    expanded JSON view of `{ timestamp, level, file, line, message, context,
    error }`; hover reveals a per-row copy button.
  - Pure helper `formatLogEntry(entry): LogRecord` (serializable) shared by
    expand + copy — unit-testable without React.
  - `translations.ts` (namespace `@dxos/react-ui-debug`) + `LogPanel.stories.tsx`
    (buttons emit sample `log.info/warn/error`).

Package shape mirrors `@dxos/react-ui-card`: `moon.yml`
(`ts-vite-build`/`ts-test`/`ts-test-storybook`/`pack`/`storybook`),
`package.json` with `"private": true`, `.storybook/`, `vite.config.ts`,
`tsconfig.json`.

### 2. devtools consumption + Panel refactor

- **`components/performance/panels/LoggingPanel.tsx`** becomes a thin wrapper:
  `<Panel {...props} icon='ph--list--regular' title='Logging' maxHeight={0}>
  <LogPanel /></Panel>` importing `LogPanel` from `@dxos/react-ui-debug`. The old
  inline implementation is deleted (no shim). Add the `workspace:*` dep +
  tsconfig reference.
- **`components/performance/Panel.tsx`** reimplemented on the `@dxos/react-ui`
  `Panel` primitive, preserving the `PanelProps`/`CustomPanelProps` API
  (`id/icon/title/info/padding/maxHeight/open/onToggle`). Header → `Panel.Toolbar`
  (clickable, toggles), body → `Panel.Content` with the existing
  `maxHeight`/collapse behavior. All consumers unchanged.

### 3. `plugin-debug` — R0 wiring

- Add `@dxos/react-ui-debug` (`workspace:*`) dep + tsconfig ref + translations
  (`logs.label`, `open-logs.label`).
- **Companion (R0):** `app-graph-builder.ts` adds
  `AppNode.makeDeckCompanion({ id: 'logs', label, icon: 'ph--list-magnifying-glass--regular', data: 'logs' })`
  (mirrors `spaceObjects`). `react-surface.tsx` adds a `Surface`
  (`filter: Surface.makeFilter(AppSurface.deckCompanion('logs'))`) rendering
  `<LogPanel />` — the R0 button (companion tab) + full panel.
- **Popover quick-view:** a new `LogStatus` container rendered in an
  `AppSurface.StatusIndicator` surface — a `StatusBar` button that opens
  `<LogPanel>` in a `@dxos/react-ui` `Popover`.

## Data flow

`log('…', ctx)` → `processLog` runs all processors → `<LogPanel>`'s processor
applies `shouldLog(entry, config.filters)` and appends to the component-local
ring buffer (most-recent N) → React re-renders. Changing the filter/level calls
`log.config({ filter })`, updating the global console/logging threshold too.

## Error handling / edge cases

- Clipboard: guard `navigator.clipboard` absence; no throw.
- Buffer overflow: `slice(-maxLines)` drops oldest; count shown.
- Recording off: no processor registered → zero cost.
- `log.config({ filter })` resets `captureFilter` to default; acceptable for a
  dev tool. The panel must never call `log(...)` in its own processor (feedback
  loop).
- Function-valued contexts resolved via `LogEntry.computedContext`; the panel
  serializes the computed record, never the raw closure.

## Testing

- `react-ui-debug`: unit test `formatLogEntry` (level letter, file basename,
  context/error extraction); storybook story + `ts-test-storybook` for the
  panel; a light interaction test (emit a log, assert a row appears, clear
  empties it).
- devtools: `moon run devtools:build`; visual check that StatsPanel + collapsible
  panels still render after the `Panel` refactor.
- `plugin-debug`: existing `DebugPlugin.test.ts` passes; new surfaces are thin.
