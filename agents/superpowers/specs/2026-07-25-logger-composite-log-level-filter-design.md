# Logger composite + per-file log-level filter — design

Date: 2026-07-25
Package: `@dxos/react-ui-debug`
Related: `@dxos/log`

## Summary

Refactor the monolithic `LogPanel` (in `@dxos/react-ui-debug`) into a Radix-style
composite named `Logger`, then add a feature that lets a user set a `@dxos/log`
level for **any** individual file or for **all** files, live, from the panel.

Two call sites consume the component today and will assemble the parts
themselves:

- `packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx`
- `packages/stories/storybook-testing/src/modules/LoggingModule.tsx`

## Decisions (locked)

1. **Location unchanged** — stays in `@dxos/react-ui-debug` (no new
   `react-ui-logging` package).
2. **Rename to `Logger`** — composite namespace `Logger.Root` / `Logger.Toolbar`
   / `Logger.Content` / `Logger.List` (+ `Logger.Levels`).
3. **File source = `@dxos/log` dev registry, populated at module load**
   (revised — supersedes the earlier "live stream" decision). `@dxos/log`
   maintains a registry of log files. In **development mode** every module that
   uses a logged callee registers its file at load time via the
   `@dxos/vite-plugin-log` transform (which already injects a `__dxlog_file`
   preamble per module). The registry owns the **file list only**; per-file
   _levels_ remain a `Logger`-panel concern composed into the `@dxos/log` filter
   string. `Logger.Root` unions the registry with any files it observes in the
   live stream, so it still works where the transform is absent (tests, plain
   Storybook).
4. **Level UI = dedicated Levels section + popover** — `Logger.Levels` opened
   from a Toolbar button.
5. **Consumers assemble parts** — pure composite; each call site composes the
   standard layout itself (no pre-composed default view).

## Registry architecture (`@dxos/log` + `@dxos/vite-plugin-log`)

- **Registry singleton** (`packages/common/log/src/registry.ts`): a
  `LogFileRegistry` — `register(file)`, `getFiles(): string[]` (sorted copy),
  `subscribe(listener): () => void`, `clear()`. Instantiated as a **global
  singleton** `logFileRegistry = ((globalThis as any).DX_LOG_FILES ??=
createLogFileRegistry())`, mirroring how `log` is `globalThis.DX_LOG` — one
  instance across duplicate module copies. Exported from the package index.
- **Population = transform-injected, dev-only.** `computeLogMetaEdits`
  (`tools/vite-plugin-log/src/transform.ts`) already inserts
  `var __dxlog_file="<path>";` into the preamble of every module with a logged
  binding. A new `registerFiles` option (threaded through `transform()` and the
  transform specs) appends **one guarded statement** to that same preamble edit:
  `globalThis.DX_LOG_FILES&&globalThis.DX_LOG_FILES.register(__dxlog_file);`.
  No injected imports (no binding collisions); the `&&` guard makes it a no-op
  wherever the registry global is absent.
- **Dev gate.** The Vite plugin passes `registerFiles: isServe` (serve =
  development), so **production builds inject nothing** and the registry stays
  empty. `transformLogMeta` (esbuild/`dx-compile`) and the standalone rolldown
  plugin default `registerFiles: false`.
- **Consumer.** `Logger.Root` reads `logFileRegistry.getFiles()`, subscribes for
  updates, and unions with files seen in its own processor — the registry is the
  superset in dev; the stream is the fallback elsewhere.

## Background: `@dxos/log` filter semantics

`parseFilter` (`packages/common/log/src/options.ts`) splits a comma-separated
string into `LogFilter[]`, each `{ level, pattern? }` where `pattern` is
`file:level` (or a bare `level` = all files, or `-pattern:level` = exclude).

`matchFilter` / `shouldLog` (`packages/common/log/src/context.ts`):

- A bare filter (no pattern) returns `true` when `entryLevel >= filterLevel`.
- An include filter (`file:level`) whose pattern is a substring of the entry's
  file returns `entryLevel >= filterLevel` (so it can return **`false`**).
- `shouldLog` passes iff at least one defined result is `true` **and none is
  `false`** — an explicit `false` from any matched filter suppresses the entry.

Consequences that make composition work with a single combined string:

- Override **below** base level → _raises_ verbosity for that file (adds a
  passing match for entries the base filter drops).
- Override **above** base level → _quiets_ that file (its include filter returns
  `false` below the override, overriding the base's `true`).
- Order-independent.

`processLog` (`packages/common/log/src/log.ts`) invokes **every** processor for
**every** entry regardless of level; filtering happens inside the processor via
`shouldLog`. Therefore the panel's processor sees all files (complete discovery)
while only displaying entries that pass the combined filter.

## Architecture

### Files

```
packages/ui/react-ui-debug/src/components/Logger/
  Logger.tsx          # composite (was LogPanel.tsx)
  format.ts           # moved unchanged from LogPanel/
  Logger.stories.tsx  # reworked story (was LogPanel.stories.tsx)
  index.ts            # barrel
```

- Delete `components/LogPanel/`.
- `components/index.ts` re-exports `./Logger`.
- `package.json`: add catalog deps `@radix-ui/react-context`,
  `@radix-ui/react-slot`, `@radix-ui/react-primitive`.
- Translations: add keys for the Levels UI (`levels.label`, `levels.title`,
  `levels.clear`, `levels.inherit`, `levels.empty`, `levels.count`).

### Composite parts (per `composite-components` skill)

Radix idiom: `forwardRef` parts, `Slot`/`asChild`, dotted `displayName`, every
Props type exported, namespace assembled as an object literal. Context via
`createContext` from `@radix-ui/react-context`. Classnames via `mx()` +
Tailwind — no `logger.*` theme-token file (the panel has none today and a token
namespace owned from a sibling package is inappropriate coupling; documented
deviation from the skill's `tx()` guidance).

- **`Logger.Root`** — headless provider, renders no DOM of its own (renders
  `children`). Owns all state and side effects:
  - state: `rows: LogRow[]`, `filter` (base), `recording`, `expanded: Set<number>`,
    `fileLevels: Map<string, LogLevel>`, derived `files: string[]` (sorted unique).
  - `capacity` normalization (from `maxLines`), monotonic `nextRowId`.
  - `files` sourced from `logFileRegistry.getFiles()` + a `subscribe`, **unioned**
    with files seen in the stream.
  - effects: ref-counted `acquire/releaseLogConfig`; a single `addProcessor`
    subscription that (a) records `entry.meta?.F` into the files set for every
    entry (stream fallback), (b) pushes rows that pass
    `shouldLog(entry, config.filters)`; plus a `logFileRegistry.subscribe`.
  - `log.config({ filter: effectiveFilter })` recomputed from base `filter` +
    `fileLevels` whenever either changes and `recording` is on.
  - callbacks: `setFilter`, `setRecording`, `setFileLevel(file, level | undefined)`
    (undefined clears the override), `clearFileLevels`, `clear`, `copyAll`,
    `toggleExpand`.
  - props: `LoggerRootProps = { maxLines?, initialFilter?, defaultRecording?,
children }`.
- **`Logger.Toolbar`** — filter `Input`, base-level `Select` ("all files"),
  record `ToggleIconButton`, clear + copy `Toolbar.IconButton`s, and a Levels
  `Popover` trigger (`IconButton`) whose label/badge reflects
  `fileLevels.size`. Consumes context.
- **`Logger.Content`** — `ScrollArea` viewport that auto-pins to newest; renders
  `children` (normally `Logger.List`).
- **`Logger.List`** — the log-entry rows extracted verbatim from today's render
  (level color, file, message expand/collapse, per-entry copy). Consumes context.
- **`Logger.Levels`** — per-file control. One row per discovered file: file name
  - a level `Select` whose options are the six levels plus an "Inherit" option
    (clears the override, falling back to base). A clear-all action. Empty state
    when no files seen yet. Rendered inside the Toolbar's `Popover.Content`.

### Effective-filter computation

```
effectiveFilter = [baseFilter, ...[...fileLevels].map(([file, level]) => `${file}:${levelName(level)}`)]
  .filter(Boolean)
  .join(', ')
```

`levelName` maps `LogLevel` → the lowercase token used by `parseFilter`
(`trace|debug|verbose|info|warn|error`). Applied via `log.config({ filter })` in
Root's effect. `shouldLog` in the processor then reflects the combined filters.

### Consumer assembly (both call sites)

```tsx
<Logger.Root initialFilter='info'>
  <Panel.Root classNames='bs-full'>
    <Panel.Toolbar asChild>
      <Logger.Toolbar />
    </Panel.Toolbar>
    <Panel.Content asChild>
      <Logger.Content>
        <Logger.List />
      </Logger.Content>
    </Panel.Content>
  </Panel.Root>
</Logger.Root>
```

(Exact wrapping mirrors the current `Panel.Root/Toolbar/Content` usage;
`LogStatus` keeps its `Popover` + `is-[40rem] bs-[24rem]` viewport.)

## Testing / verification

- Rework `Logger.stories.tsx`: toolbar buttons emit `log.info/warn/error` from a
  few **distinct synthetic files** (via hand-written `meta: { F: '<file>', L }`)
  so the Levels list populates deterministically (`random.seed`).
- Manual verification in the running Storybook (port 9009, reuse the user's):
  1. Emit logs from several files; confirm they appear at base `info`.
  2. Open Levels popover; confirm every emitting file is listed.
  3. Raise one file to `debug` (base `info`); emit a debug line from it →
     only that file's debug lines appear.
  4. Quiet another file to `error`; emit `info`/`warn` from it → suppressed,
     `error` still shows.
  5. "Inherit" on a file clears its override; clear-all empties the map.
- `pnpm format`; `moon run react-ui-debug:build`; `moon run :lint -- --fix`
  scoped to the package.

## Out of scope (YAGNI)

- Registry owns the **file list only** — no per-file level state or `shouldLog`
  integration in `@dxos/log` (levels stay a panel concern via the filter string).
- No persistence of per-file levels across reloads.
- No regex/glob patterns beyond `@dxos/log`'s existing substring matching.
- No `logger.*` theme-token file.
- No pre-composed default view (consumers assemble).
