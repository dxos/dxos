# Logger Composite + Per-File Log-Level Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `@dxos/react-ui-debug`'s `LogPanel` into a Radix-style composite `Logger`, add a `@dxos/log` dev-mode registry of log files (populated at module load by the transform), and add a UI to set a log level for any individual file or all files.

**Architecture:** `@dxos/log` gains a global-singleton `LogFileRegistry` (`globalThis.DX_LOG_FILES`). In development, `@dxos/vite-plugin-log`'s transform appends one guarded registration line to the `__dxlog_file` preamble it already injects per module, so every log-using file registers at load. A headless `Logger.Root` provider unions the registry's files with any it sees in the live stream, owns all panel state/effects, and composes the base filter with per-file overrides into a single `@dxos/log` filter string; `@dxos/log`'s substring+level matching makes a below-base override _raise_ a file's verbosity and an above-base override _quiet_ it. Presentational parts `Logger.Toolbar` / `Content` / `List` / `Levels` consume context.

**Tech Stack:** React (arrow components, named imports), TypeScript, `@dxos/log`, `@dxos/vite-plugin-log` (Rolldown/Oxc AST transform, `RolldownMagicString`), `@dxos/react-ui` primitives (Panel, Toolbar, Select, Input, Popover, ScrollArea, IconButton, ToggleIconButton), `@radix-ui/react-context`, TailwindCSS via `mx()`, Storybook, moon, oxfmt, vitest.

## Global Constraints

- **Branch safety:** only edit on the assigned `claude/…` branch; never on `main`.
- **No casts** (`as any`, `as unknown as T`, non-null `!`) to satisfy the type-checker; `as const` is fine. (The transform code already contains some `as any` at library boundaries — do not add new ones; match the file's existing minimal usage only where unavoidable and pre-existing.)
- **Copyright header** `// Copyright 2026 DXOS.org //` on every new `.ts`/`.tsx` file.
- **Imports grouped** builtin → external → @dxos → internal → parent → sibling, blank line between groups. Named exports; no default exports.
- **React:** arrow-function components, named React imports; forwarded ref param named `forwardedRef`.
- **Composite idiom** (`composite-components` skill): internal names prefixed (`LoggerRoot`), dotted `displayName` (`'Logger.Root'`), every Props type exported, namespace assembled as an object literal, section comments between parts. **Deviation (approved):** classnames use `mx()` + Tailwind, not `tx()` theme tokens.
- **Registry global name is `DX_LOG_FILES`** (mirrors the existing `globalThis.DX_LOG`). The transform-injected call is exactly `globalThis.DX_LOG_FILES&&globalThis.DX_LOG_FILES.register(__dxlog_file);` (no spaces, guarded).
- **Registry is dev-only.** The Vite plugin passes `registerFiles: isServe`; `transformLogMeta` and the standalone rolldown transform default `registerFiles: false`. Production builds inject nothing.
- **Registry owns the file list only** — no per-file level state or `shouldLog` changes in `@dxos/log`.
- **Level values are name strings** (`'trace'|'debug'|'verbose'|'info'|'warn'|'error'`) end-to-end; the effective filter is a plain comma-joined string. Per-file map keys on `entry.meta?.F` / the registry's raw path; the basename (`path.split('/').pop()`) is display-only.
- **Workspace deps** `workspace:*`; external deps from the **catalog**.
- **Format before commit:** `pnpm format`, stage the result.
- **Do not break the shared transform.** Task 4 touches code that runs on every package's build. It is TDD'd, its full test suite is run before commit, and dependent tasks come after it.

---

## File Structure

```
packages/common/log/
  src/registry.ts                           # NEW: LogFileRegistry singleton
  src/registry.test.ts                      # NEW
  src/index.ts                              # MODIFY: export ./registry
tools/vite-plugin-log/
  src/definitions.ts                        # MODIFY: registerFiles option on transform types
  src/transform.ts                          # MODIFY: inject registration line when registerFiles
  src/plugin.ts                             # MODIFY: pass registerFiles: isServe
  src/transform.test.ts                     # MODIFY: assert injected line (+ off by default)
packages/ui/react-ui-debug/
  package.json                              # DONE (Task 1): 3 radix catalog deps
  src/translations.ts                       # MODIFY: levels.* keys
  src/components/index.ts                   # MODIFY: export ./Logger
  src/components/Logger/
    format.ts                               # DONE (Task 1): moved from LogPanel/
    format.test.ts                          # Task 2: moved from LogPanel/
    Logger.tsx                              # NEW: composite
    Logger.test.ts                          # NEW: composeFilter tests
    index.ts                                # NEW: barrel
    Logger.stories.tsx                      # NEW: reworked story
packages/plugins/plugin-debug/
  src/containers/LogStatus/LogStatus.tsx    # MODIFY: assemble Logger parts
packages/stories/storybook-testing/
  src/modules/LoggingModule.tsx             # MODIFY: assemble Logger parts
```

Deleted in Task 9: `packages/ui/react-ui-debug/src/components/LogPanel/` (`LogPanel.tsx`, `LogPanel.stories.tsx`, `index.ts`).

---

### Task 1: Package deps + move `format.ts` — ✅ DONE (commit b8c1a0c3fd)

Radix catalog deps added; `format.ts` moved to `Logger/`. (Note: `format.test.ts` was NOT moved — Task 2 fixes that.)

---

### Task 2: Move `format.test.ts`; remove the now-broken `LogPanel`

**Why now:** Task 1 moved `format.ts` into `Logger/`, but `LogPanel.tsx` and `LogPanel/index.ts` still `import './format'` (now missing) — so `react-ui-debug` does not build until `LogPanel` is removed. Remove it here so every later `react-ui-debug:build` is green. The package temporarily exports only the `format` helper until `Logger` lands (Task 9). External consumers (`LogStatus`, `LoggingModule`) still import `LogPanel` but are not built until Task 10.

**Files:**

- Move: `LogPanel/format.test.ts` → `Logger/format.test.ts`
- Delete: `LogPanel/LogPanel.tsx`, `LogPanel/LogPanel.stories.tsx`, `LogPanel/index.ts`
- Modify: `packages/ui/react-ui-debug/src/components/index.ts`

**Interfaces:** `formatLogEntry` / `LogRecord` remain exported from the package (via `./Logger/format`). `LogPanel` export is removed (restored as `Logger` in Task 9).

- [ ] **Step 1: Move the test and delete LogPanel**

Run:

```bash
git mv packages/ui/react-ui-debug/src/components/LogPanel/format.test.ts packages/ui/react-ui-debug/src/components/Logger/format.test.ts
git rm packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.tsx \
       packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.stories.tsx \
       packages/ui/react-ui-debug/src/components/LogPanel/index.ts
```

- [ ] **Step 2: Repoint the components barrel to the surviving format helper**

Replace `packages/ui/react-ui-debug/src/components/index.ts` body with:

```ts
//
// Copyright 2026 DXOS.org
//

// Temporary: only the format helper survives until the Logger composite lands (see plan Task 9).
export * from './Logger/format';
```

- [ ] **Step 3: Confirm no dangling `LogPanel` refs inside the package + build**

Run:

```bash
grep -rn "LogPanel\|./format'" packages/ui/react-ui-debug/src/components
moon run react-ui-debug:build
moon run react-ui-debug:test -- src/components/Logger/format.test.ts
```

Expected: no `LogPanel` references remain in the package; build PASS; format test PASS (2 tests). (The relative `./format` import still resolves in the new location.)

- [ ] **Step 4: Commit**

```bash
git add -A packages/ui/react-ui-debug/src/components
git commit -m "react-ui-debug: remove LogPanel; relocate format.test.ts (Logger lands next)"
```

---

### Task 3: `@dxos/log` file registry module

**Files:**

- Create: `packages/common/log/src/registry.ts`
- Create: `packages/common/log/src/registry.test.ts`
- Modify: `packages/common/log/src/index.ts`

**Interfaces:**

- Produces (exported from `@dxos/log`):
  ```ts
  export interface LogFileRegistry {
    register(file: string): void;
    getFiles(): string[]; // sorted copy
    subscribe(listener: () => void): () => void; // returns unsubscribe
    clear(): void;
  }
  export const createLogFileRegistry: () => LogFileRegistry;
  export const logFileRegistry: LogFileRegistry; // global singleton on globalThis.DX_LOG_FILES
  ```
- The transform (Task 4) will call `globalThis.DX_LOG_FILES.register(...)`; this task is what makes that global exist (created when `@dxos/log` is first imported).

- [ ] **Step 1: Write the failing test**

Create `packages/common/log/src/registry.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createLogFileRegistry } from './registry';

describe('LogFileRegistry', () => {
  test('registers unique files, returned sorted', () => {
    const registry = createLogFileRegistry();
    registry.register('b.ts');
    registry.register('a.ts');
    registry.register('b.ts');
    expect(registry.getFiles()).toEqual(['a.ts', 'b.ts']);
  });

  test('getFiles returns a copy (callers cannot mutate internal state)', () => {
    const registry = createLogFileRegistry();
    registry.register('a.ts');
    registry.getFiles().push('x.ts');
    expect(registry.getFiles()).toEqual(['a.ts']);
  });

  test('notifies subscribers only on a new file; unsubscribe stops notifications', () => {
    const registry = createLogFileRegistry();
    let count = 0;
    const unsubscribe = registry.subscribe(() => {
      count++;
    });
    registry.register('a.ts');
    registry.register('a.ts'); // duplicate — no notification
    expect(count).toBe(1);
    unsubscribe();
    registry.register('b.ts');
    expect(count).toBe(1);
  });

  test('clear empties the registry and notifies', () => {
    const registry = createLogFileRegistry();
    let count = 0;
    registry.subscribe(() => {
      count++;
    });
    registry.register('a.ts');
    registry.clear();
    expect(registry.getFiles()).toEqual([]);
    expect(count).toBe(2);
  });

  test('register ignores empty/non-string input', () => {
    const registry = createLogFileRegistry();
    registry.register('');
    expect(registry.getFiles()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `moon run log:test -- src/registry.test.ts`
Expected: FAIL — cannot find module `./registry`.

- [ ] **Step 3: Write `registry.ts`**

Create `packages/common/log/src/registry.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/**
 * Registry of source files that use `@dxos/log`, populated at module load by the
 * `@dxos/vite-plugin-log` transform in development. Enables tooling (e.g. the Logger
 * panel) to enumerate log files and offer per-file level control. The registry owns
 * the file list only — levels are applied via the standard `@dxos/log` filter string.
 */
export interface LogFileRegistry {
  /** Register a file path (idempotent; notifies subscribers only when newly added). */
  register(file: string): void;
  /** Sorted copy of registered file paths. */
  getFiles(): string[];
  /** Subscribe to registry changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Remove all registered files (notifies subscribers). */
  clear(): void;
}

export const createLogFileRegistry = (): LogFileRegistry => {
  const files = new Set<string>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    register: (file) => {
      if (typeof file !== 'string' || file.length === 0 || files.has(file)) {
        return;
      }
      files.add(file);
      notify();
    },
    getFiles: () => [...files].sort(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => {
      files.clear();
      notify();
    },
  };
};

/**
 * Global singleton so all (possibly duplicated) copies of `@dxos/log` and the
 * transform-injected `globalThis.DX_LOG_FILES.register(...)` calls share one registry —
 * mirrors how `log` is `globalThis.DX_LOG`.
 */
export const logFileRegistry: LogFileRegistry = ((globalThis as any).DX_LOG_FILES ??= createLogFileRegistry());
```

- [ ] **Step 4: Export from the package index**

In `packages/common/log/src/index.ts`, add after the other `export *` lines (keep grouping):

```ts
export * from './registry';
```

- [ ] **Step 5: Run the test**

Run: `moon run log:test -- src/registry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Build the package**

Run: `moon run log:build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/common/log/src/registry.ts packages/common/log/src/registry.test.ts packages/common/log/src/index.ts
git commit -m "log: add dev-mode LogFileRegistry singleton (globalThis.DX_LOG_FILES)"
```

---

### Task 4: `@dxos/vite-plugin-log` — inject module-load registration (dev only)

**Files:**

- Modify: `tools/vite-plugin-log/src/definitions.ts`
- Modify: `tools/vite-plugin-log/src/transform.ts`
- Modify: `tools/vite-plugin-log/src/plugin.ts`
- Modify: `tools/vite-plugin-log/src/transform.test.ts`

**Interfaces:**

- Consumes: nothing new (references the `globalThis.DX_LOG_FILES` global created by Task 3 at runtime; no import).
- Produces: `transform(code, ast, filename, { specs, registerFiles? })` and `computeLogMetaEdits(program, code, specs, displayPath, options?)` gain an optional `registerFiles` flag; `LogMetaTransformOptions` gains `registerFiles?: boolean`; `transformLogMeta` gains `registerFiles` in its options bag (default `false`).

**Context:** `computeLogMetaEdits` already pushes one preamble edit at `preambleInsertIndex` containing `var __dxlog_file="<path>";\n`. When `registerFiles` is true, that same edit's `text` gains a second line so no new offsets/edits are introduced. All three transform entry points (`transform`, `transformLogMeta`, `rolldownLogMetaTransform`) funnel through `computeLogMetaEdits`.

- [ ] **Step 1: Write the failing tests**

In `tools/vite-plugin-log/src/transform.test.ts`, first inspect an existing test to match the harness (it calls `transformLogMeta(code, filename, options)` or `computeLogMetaEdits`/`transform` directly — mirror whichever the file uses). Add two tests:

```ts
test('registerFiles injects a guarded registration line after the preamble', () => {
  const src = ['import { log } from "@dxos/log";', 'log("hello");', ''].join('\n');
  const out = transformLogMeta(src, 'src/module.ts', { registerFiles: true }) ?? src;
  expect(out).toContain('var __dxlog_file="src/module.ts";');
  expect(out).toContain('globalThis.DX_LOG_FILES&&globalThis.DX_LOG_FILES.register(__dxlog_file);');
});

test('registerFiles defaults off — no registration line', () => {
  const src = ['import { log } from "@dxos/log";', 'log("hello");', ''].join('\n');
  const out = transformLogMeta(src, 'src/module.ts') ?? src;
  expect(out).toContain('var __dxlog_file="src/module.ts";');
  expect(out).not.toContain('DX_LOG_FILES');
});
```

If the file's existing tests use `computeLogMetaEdits`/`transform` with `RolldownMagicString` instead of `transformLogMeta`, write the two tests in that same style (pass `{ specs: DEFAULT_LOG_META_TRANSFORM_SPEC, registerFiles: true }` to `transform`, and assert on `code.toString()`). Match the file — do not introduce a second harness style.

- [ ] **Step 2: Run to verify they fail**

Run: `moon run vite-plugin-log:test -- src/transform.test.ts`
Expected: the new `registerFiles injects…` test FAILS (line absent); the `defaults off` test may already pass.

- [ ] **Step 3: Thread `registerFiles` through the transform**

In `tools/vite-plugin-log/src/transform.ts`:

(a) `transform` signature — add `registerFiles` to the options bag and pass it on:

```ts
export function transform(
  code: RolldownMagicString,
  ast: Program,
  filename: string,
  options: { specs: LogMetaTransformSpec[]; registerFiles?: boolean },
): void {
  const edits = computeLogMetaEdits(ast, code.toString(), options.specs, filename, {
    registerFiles: options.registerFiles ?? false,
  });
  const sorted = [...edits].sort((a, b) => b.pos - a.pos);
  for (const { pos, text } of sorted) {
    code.appendLeft(pos, text);
  }
}
```

(b) `transformLogMeta` — add `registerFiles` to its options and forward:

```ts
export const transformLogMeta = (
  code: string,
  filename: string,
  options: { specs?: LogMetaTransformSpec[]; lang?: 'ts' | 'tsx' | 'js' | 'jsx'; registerFiles?: boolean } = {},
): string | null => {
  const lang = options.lang ?? langFromFilename(filename);
  if (lang === undefined) {
    return null;
  }
  const ast = parseAst(code, { astType: lang.includes('ts') ? 'ts' : 'js', lang });
  const ms = new RolldownMagicString(code);
  transform(ms, ast, filename, {
    specs: options.specs ?? DEFAULT_LOG_META_TRANSFORM_SPEC,
    registerFiles: options.registerFiles ?? false,
  });
  const next = ms.toString();
  return next === code ? null : next;
};
```

(c) `computeLogMetaEdits` — accept options and extend the preamble text:

```ts
export function computeLogMetaEdits(
  program: Program,
  code: string,
  specs: LogMetaTransformSpec[],
  displayPath: string,
  options: { registerFiles?: boolean } = {},
): LogMetaEdit[] {
  if (specs.length === 0) {
    return [];
  }

  const bindings = collectImportBindings(program, specs);
  if (bindings.size === 0) {
    return [];
  }

  const edits: LogMetaEdit[] = [];
  const preambleAt = preambleInsertIndex(program);
  const leadingNewline = preambleAt > 0 && code[preambleAt - 1] !== '\n' ? '\n' : '';
  const registration = options.registerFiles
    ? 'globalThis.DX_LOG_FILES&&globalThis.DX_LOG_FILES.register(__dxlog_file);\n'
    : '';
  edits.push({
    pos: preambleAt,
    text: `${leadingNewline}var __dxlog_file=${JSON.stringify(displayPath)};\n${registration}`,
  });

  // ... unchanged Visitor block ...
```

(Leave the `new Visitor({...})` body and the rest of the function exactly as-is.)

- [ ] **Step 4: Add the option to definitions and the rolldown context type**

In `tools/vite-plugin-log/src/definitions.ts`, add to `LogMetaTransformOptions`:

```ts
  /** Inject a `globalThis.DX_LOG_FILES.register(...)` line per module (dev only). @default false */
  registerFiles?: boolean;
```

- [ ] **Step 5: Have the Vite plugin enable it in serve mode**

In `tools/vite-plugin-log/src/plugin.ts`, the meta-transform hook already tracks `isServe` (set in `configResolved`). In the `handler`, the `doMetaTransform` branch calls `transform(ms, program, metaOptions!.filename ?? id, { specs: metaOptions!.to_transform })`. Change that call to:

```ts
transform(ms, program, metaOptions!.filename ?? id, {
  specs: metaOptions!.to_transform,
  registerFiles: isServe,
});
```

Also update `rolldownLogMetaTransform` (standalone) to forward `options.registerFiles` (default false):

```ts
transform(ms, ctx.ast, options.filename ?? ctx.id, {
  specs: options.to_transform,
  registerFiles: options.registerFiles ?? false,
});
```

- [ ] **Step 6: Run the transform tests (full file — this is the shared transform)**

Run: `moon run vite-plugin-log:test -- src/transform.test.ts`
Expected: PASS, including the two new tests and all pre-existing preamble assertions (which still see `var __dxlog_file="src/module.ts";` — the registration line is only added when `registerFiles` is passed, and existing tests don't pass it).

- [ ] **Step 7: Build the plugin**

Run: `moon run vite-plugin-log:build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add tools/vite-plugin-log/src/definitions.ts tools/vite-plugin-log/src/transform.ts tools/vite-plugin-log/src/plugin.ts tools/vite-plugin-log/src/transform.test.ts
git commit -m "vite-plugin-log: dev-mode module-load registration into DX_LOG_FILES"
```

---

### Task 5: `Logger.Root` — headless provider (registry + stream, filter composition)

**Files:**

- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (Root only; later tasks append parts)

**Interfaces:**

- Consumes: `formatLogEntry` from `./format`; `logFileRegistry` from `@dxos/log`.
- Produces (via `useLoggerContext('<part>')`):

  ```ts
  type LevelName = 'trace' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';
  type LogRow = { id: number; entry: LogEntry };
  type LoggerContextValue = {
    rows: LogRow[];
    filter: string;
    setFilter: (filter: string) => void;
    recording: boolean;
    setRecording: (fn: (value: boolean) => boolean) => void;
    files: string[]; // registry ∪ stream, sorted
    fileLevels: Map<string, LevelName>;
    setFileLevel: (file: string, level: LevelName | undefined) => void;
    clearFileLevels: () => void;
    expanded: Set<number>;
    toggleExpand: (id: number) => void;
    clear: () => void;
    copyAll: () => void;
  };
  ```

  Also exports `LEVELS`, `levelColor`, `copyToClipboard`, `composeFilter`, `useLoggerContext`, `LoggerRootProps`, `LevelName`.

- [ ] **Step 1: Write `Logger.tsx` with shared helpers + Root**

Create `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, logFileRegistry, shouldLog } from '@dxos/log';

import { formatLogEntry } from './format';

//
// Shared
//

export const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;
export type LevelName = (typeof LEVELS)[number];

const DEFAULT_MAX_LINES = 1000;

export const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

// Ref-counted global-config ownership so concurrent panels restore the original config only after the last stops.
let activeRecorders = 0;
let sharedSavedOptions: LogOptions | undefined;

const acquireLogConfig = (): void => {
  if (activeRecorders === 0) {
    sharedSavedOptions = log.runtimeConfig.options;
  }
  activeRecorders += 1;
};

const releaseLogConfig = (): void => {
  activeRecorders = Math.max(0, activeRecorders - 1);
  if (activeRecorders === 0 && sharedSavedOptions) {
    log.config(sharedSavedOptions);
    sharedSavedOptions = undefined;
  }
};

// Guard clipboard writes so rejected or unavailable writes surface rather than dangling as unhandled rejections.
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

type LogRow = { id: number; entry: LogEntry };

// Compose the base filter with per-file overrides into a single @dxos/log filter string.
// Order-independent: an override below the base level raises that file's verbosity; above, it quiets it.
export const composeFilter = (base: string, fileLevels: Map<string, LevelName>): string =>
  [base, ...[...fileLevels].map(([file, level]) => `${file}:${level}`)].filter(Boolean).join(', ');

//
// Context
//

type LoggerContextValue = {
  rows: LogRow[];
  filter: string;
  setFilter: (filter: string) => void;
  recording: boolean;
  setRecording: (fn: (value: boolean) => boolean) => void;
  files: string[];
  fileLevels: Map<string, LevelName>;
  setFileLevel: (file: string, level: LevelName | undefined) => void;
  clearFileLevels: () => void;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  clear: () => void;
  copyAll: () => void;
};

const [LoggerProvider, useLoggerContext] = createContext<LoggerContextValue>('Logger');

//
// Root
//

export type LoggerRootProps = PropsWithChildren<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

const LoggerRoot = ({
  children,
  maxLines = DEFAULT_MAX_LINES,
  initialFilter = 'info',
  defaultRecording = true,
}: LoggerRootProps) => {
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fileLevels, setFileLevels] = useState<Map<string, LevelName>>(new Map());
  const [files, setFiles] = useState<string[]>(() => logFileRegistry.getFiles());

  // Union any newly seen file into the sorted set (registry load-time entries and stream entries alike).
  const addFile = useCallback((file: string) => {
    setFiles((prev) => (prev.includes(file) ? prev : [...prev, file].sort()));
  }, []);

  // Track files registered at module load (dev registry), unioned with the initial snapshot.
  useEffect(() => {
    const sync = () => {
      for (const file of logFileRegistry.getFiles()) {
        addFile(file);
      }
    };
    sync();
    return logFileRegistry.subscribe(sync);
  }, [addFile]);

  // Normalize the public prop: a non-positive or non-finite bound would defeat `slice(-capacity)`.
  const capacity = useMemo(
    () => (Number.isFinite(maxLines) && maxLines >= 1 ? Math.floor(maxLines) : DEFAULT_MAX_LINES),
    [maxLines],
  );

  // Monotonic id so list keys stay stable once `slice(-capacity)` drops older rows.
  const nextRowId = useRef(0);

  // Acquire/release the shared global-config ownership across the recording lifetime (ref-counted across panels).
  useEffect(() => {
    if (!recording) {
      return;
    }
    acquireLogConfig();
    return () => releaseLogConfig();
  }, [recording]);

  // Apply the composed filter and capture entries while recording; discover every file regardless of the display filter.
  const effectiveFilter = useMemo(() => composeFilter(filter, fileLevels), [filter, fileLevels]);
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter: effectiveFilter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      const file = entry.meta?.F;
      if (file) {
        addFile(file);
      }
      if (shouldLog(entry, config.filters)) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacity));
      }
    });

    return () => dispose();
  }, [recording, effectiveFilter, capacity, addFile]);

  // Drop expansion state for evicted rows so the set stays bounded (no-op while nothing is expanded).
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const ids = new Set(rows.map((row) => row.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const setFileLevel = useCallback((file: string, level: LevelName | undefined) => {
    setFileLevels((prev) => {
      const next = new Map(prev);
      if (level) {
        next.set(file, level);
      } else {
        next.delete(file);
      }
      return next;
    });
  }, []);
  const clearFileLevels = useCallback(() => setFileLevels(new Map()), []);
  const clear = useCallback(() => {
    setRows([]);
    setExpanded(new Set());
  }, []);
  const copyAll = useCallback(() => {
    copyToClipboard(
      JSON.stringify(
        rows.map(({ entry }) => formatLogEntry(entry)),
        null,
        2,
      ),
    );
  }, [rows]);
  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <LoggerProvider
      rows={rows}
      filter={filter}
      setFilter={setFilter}
      recording={recording}
      setRecording={setRecording}
      files={files}
      fileLevels={fileLevels}
      setFileLevel={setFileLevel}
      clearFileLevels={clearFileLevels}
      expanded={expanded}
      toggleExpand={toggleExpand}
      clear={clear}
      copyAll={copyAll}
    >
      {children}
    </LoggerProvider>
  );
};

LoggerRoot.displayName = 'Logger.Root';

export { useLoggerContext };
```

- [ ] **Step 2: Verify build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx
git commit -m "react-ui-debug: add headless Logger.Root (registry + stream, filter composition)"
```

---

### Task 6: `composeFilter` behavioral test

**Files:**

- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts`

**Interfaces:** Consumes `composeFilter`, `LevelName` from `./Logger`.

- [ ] **Step 1: Write the test**

Create `packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogLevel, parseFilter, shouldLog } from '@dxos/log';

import { composeFilter, type LevelName } from './Logger';

const entry = (level: LogLevel, file: string) => ({ level, meta: { F: file } }) as any;

describe('composeFilter', () => {
  test('base only when no overrides', () => {
    expect(composeFilter('info', new Map())).toBe('info');
  });

  test('appends per-file overrides in insertion order', () => {
    const map = new Map<string, LevelName>([
      ['a.ts', 'debug'],
      ['b.ts', 'error'],
    ]);
    expect(composeFilter('info', map)).toBe('info, a.ts:debug, b.ts:error');
  });

  test('override below base raises verbosity for that file only', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'debug']])));
    expect(shouldLog(entry(LogLevel.DEBUG, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.DEBUG, 'b.ts'), filters)).toBe(false);
  });

  test('override above base quiets that file only', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'error']])));
    expect(shouldLog(entry(LogLevel.INFO, 'a.ts'), filters)).toBe(false);
    expect(shouldLog(entry(LogLevel.ERROR, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.INFO, 'b.ts'), filters)).toBe(true);
  });
});
```

- [ ] **Step 2: Run**

Run: `moon run react-ui-debug:test -- src/components/Logger/Logger.test.ts`
Expected: PASS (4 tests). Behavioral proof of the raise/quiet semantics.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts
git commit -m "react-ui-debug: test Logger filter composition raise/quiet semantics"
```

---

### Task 7: `Logger.Toolbar`, `Logger.Content`, `Logger.List` + translations

**Files:**

- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (append parts, extend imports)
- Modify: `packages/ui/react-ui-debug/src/translations.ts`

**Interfaces:**

- Consumes: `useLoggerContext`, `LEVELS`, `levelColor`, `copyToClipboard`, `formatLogEntry`.
- Produces: `LoggerToolbar`, `LoggerContent`, `LoggerList` (+ Props). Toolbar references `<LoggerLevels />`; Task 8 replaces its stub.

- [ ] **Step 1: Add translation keys**

In `packages/ui/react-ui-debug/src/translations.ts`, add inside the `[translationKey]` object after `'copy-entry.label'`:

```ts
        'levels.label': 'Log levels',
        'levels.title': 'Per-file log levels',
        'levels.clear': 'Reset all',
        'levels.inherit': 'Inherit',
        'levels.empty': 'No log files registered yet.',
```

- [ ] **Step 2: Extend `Logger.tsx` imports**

Add the external/dxos imports (keep groups ordered — external, then `@dxos/log`, then `@dxos/react-ui`, then `@dxos/ui-theme`, then `../../translations`, then `./format`):

```tsx
import {
  IconButton,
  Input,
  ScrollArea,
  Select,
  type ThemedClassName,
  ToggleIconButton,
  Toolbar,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
```

- [ ] **Step 3: Append Toolbar (with a temporary Levels stub)**

```tsx
//
// Toolbar
//

export type LoggerToolbarProps = ThemedClassName<{}>;

const LoggerToolbar = ({ classNames }: LoggerToolbarProps) => {
  const { t } = useTranslation(translationKey);
  const { filter, setFilter, recording, setRecording, clear, copyAll } = useLoggerContext('Logger.Toolbar');

  // A bare level matching the filter selects it; a scoped filter shows no selection.
  const selectedLevel = (LEVELS as readonly string[]).includes(filter) ? filter : '';

  return (
    <Toolbar.Root classNames={mx(classNames)}>
      <Input.Root>
        <Input.TextInput
          placeholder={t('filter.placeholder')}
          value={filter}
          autoComplete='off'
          spellCheck={false}
          onChange={(ev) => setFilter(ev.target.value)}
        />
      </Input.Root>
      <Select.Root value={selectedLevel} onValueChange={setFilter}>
        <Select.TriggerButton classNames='w-[6rem] text-sm' placeholder={t('level.label')} />
        <Select.Portal>
          <Select.Content>
            <Select.ScrollUpButton />
            <Select.Viewport>
              {LEVELS.map((level) => (
                <Select.Option key={level} value={level} classNames='text-sm'>
                  {t(`level.${level}`)}
                </Select.Option>
              ))}
            </Select.Viewport>
            <Select.ScrollDownButton />
            <Select.Arrow />
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <LoggerLevels />
      <ToggleIconButton
        active={recording}
        icon='ph--record--regular'
        activeIcon='ph--pause--regular'
        iconOnly
        label={t('record.label')}
        onClick={() => setRecording((value) => !value)}
      />
      <Toolbar.IconButton icon='ph--eraser--regular' iconOnly label={t('clear.label')} onClick={clear} />
      <Toolbar.IconButton icon='ph--clipboard--regular' iconOnly label={t('copy.label')} onClick={copyAll} />
    </Toolbar.Root>
  );
};

LoggerToolbar.displayName = 'Logger.Toolbar';

// Temporary stub — replaced by the full Levels popover in the next task.
const LoggerLevels = () => null;
LoggerLevels.displayName = 'Logger.Levels';
```

- [ ] **Step 4: Append Content**

```tsx
//
// Content
//

export type LoggerContentProps = ThemedClassName<PropsWithChildren>;

const LoggerContent = ({ classNames, children }: LoggerContentProps) => {
  const { rows } = useLoggerContext('Logger.Content');

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [rows]);

  return (
    <ScrollArea.Root orientation='vertical' thin classNames={mx(classNames)}>
      <ScrollArea.Viewport ref={viewportRef} classNames='text-xs'>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

LoggerContent.displayName = 'Logger.Content';
```

- [ ] **Step 5: Append List**

```tsx
//
// List
//

export type LoggerListProps = ThemedClassName<{}>;

const LoggerList = ({ classNames }: LoggerListProps) => {
  const { t } = useTranslation(translationKey);
  const { rows, expanded, toggleExpand } = useLoggerContext('Logger.List');

  if (rows.length === 0) {
    return <div className={mx('p-2 text-subdued', classNames)}>{t('empty.message')}</div>;
  }

  return (
    <div className={mx(classNames)}>
      {rows.map(({ id, entry }) => {
        const record = formatLogEntry(entry);
        const expandable = Boolean(record.context || record.error);
        return (
          <div key={id} className='group px-1'>
            <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
              <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
              <div className='truncate text-subdued'>{record.file}</div>
              <button
                type='button'
                aria-expanded={expandable ? expanded.has(id) : undefined}
                className='truncate text-start cursor-pointer'
                title={record.message}
                onClick={() => toggleExpand(id)}
              >
                {record.message}
              </button>
              <IconButton
                icon='ph--clipboard--regular'
                iconOnly
                density='xs'
                label={t('copy-entry.label')}
                variant='ghost'
                classNames='p-0 opacity-50 group-hover:opacity-100'
                onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
              />
            </div>
            {expanded.has(id) && expandable && (
              <pre className='px-4 py-1 whitespace-pre-wrap text-subdued'>
                {JSON.stringify({ context: record.context, error: record.error }, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
};

LoggerList.displayName = 'Logger.List';
```

- [ ] **Step 6: Build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx packages/ui/react-ui-debug/src/translations.ts
git commit -m "react-ui-debug: add Logger Toolbar/Content/List parts and levels translations"
```

---

### Task 7b: Rework Task 7 parts to conventions — `Listbox` list + `composable` Toolbar/Content

Two convention fixes to the parts added in Task 7, both in `Logger.tsx`:

**(A) `Logger.List` onto `@dxos/react-ui-list` `Listbox`.** Repo rule (composer-ui skill, "Lists, pickers, and stacks"): never hand-roll a list of mapped `<div>`s — flat lists use `Listbox`. (`Logger.Levels`, Task 8, is authored on `Listbox` directly.)

**(B) `Logger.Toolbar` and `Logger.Content` wrapped with `composable()`.** They are consumed as `<Panel.Toolbar asChild><Logger.Toolbar/></Panel.Toolbar>` and `<Panel.Content asChild><Logger.Content>…`. `Panel.Toolbar`/`Panel.Content` are `slottable` and warn+wrap (`dx-slot-warning` div) when the `asChild` child is not COMPOSABLE — and the slot's injected `className`/`ref` are dropped. Wrapping each part with `composable()` (from `@dxos/react-ui`, the same factory `Toolbar.Root`/`ScrollArea.Root` use) marks them COMPOSABLE and forwards the slot props to their root. Follow the `Empty.tsx` idiom (`packages/ui/react-ui-list/src/components/Empty/Empty.tsx`).

**Files:**

- Modify: `packages/ui/react-ui-debug/package.json` (add `@dxos/react-ui-list` workspace dep)
- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (`Logger.List`, `Logger.Toolbar`, `Logger.Content`, imports, Props types)

**Interfaces:** public part names unchanged. `LoggerToolbarProps` / `LoggerContentProps` become `ComposableProps` (children included for Content). `Listbox` with **no** `value`/`onValueChange` renders a non-selectable `role=list` — correct for a read-only log stream.

- [ ] **Step 1: Add the dependency**

Run:

```bash
pnpm add --filter '@dxos/react-ui-debug' '@dxos/react-ui-list@workspace:*'
```

Expected: `@dxos/react-ui-list": "workspace:*"` under `dependencies`.

- [ ] **Step 2: Imports**

In `Logger.tsx`: add `composable, composableProps` to the `@dxos/react-ui` named import; add `import { type ComposableProps } from '@dxos/ui-types';` (after the `@dxos/react-ui` import); add `import { Listbox } from '@dxos/react-ui-list';` (after `@dxos/react-ui`, before `@dxos/ui-theme`). `ThemedClassName` may no longer be needed for the reworked Toolbar/Content — keep it only if `Logger.List`/`Levels` still use it (they do: `LoggerListProps = ThemedClassName<{}>`, `LoggerLevelsProps = ThemedClassName<{}>`).

- [ ] **Step 3: Wrap `Logger.Toolbar` with `composable`**

Replace the `LoggerToolbar` definition (keep its children and displayName) with:

```tsx
export type LoggerToolbarProps = ComposableProps;

const LoggerToolbar = composable<HTMLDivElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { filter, setFilter, recording, setRecording, clear, copyAll } = useLoggerContext('Logger.Toolbar');

  // A bare level matching the filter selects it; a scoped filter shows no selection.
  const selectedLevel = (LEVELS as readonly string[]).includes(filter) ? filter : '';

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
      {/* …unchanged children: Input, base-level Select, <LoggerLevels />, record toggle, clear, copy… */}
    </Toolbar.Root>
  );
});

LoggerToolbar.displayName = 'Logger.Toolbar';
```

Keep the exact children from Task 7. `Toolbar.Root` runs its own `composableProps` internally, so passing the merged `className`/`role`/`style` through is correct (its `role !== 'none'` guard preserves the default `toolbar` role).

- [ ] **Step 4: Wrap `Logger.Content` with `composable`**

Replace the `LoggerContent` definition with:

```tsx
export type LoggerContentProps = ComposableProps;

const LoggerContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { rows } = useLoggerContext('Logger.Content');

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [rows]);

  return (
    <ScrollArea.Root {...composableProps(props)} orientation='vertical' thin ref={forwardedRef}>
      <ScrollArea.Viewport ref={viewportRef} classNames='text-xs'>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

LoggerContent.displayName = 'Logger.Content';
```

Note: `forwardedRef` goes to `ScrollArea.Root` (the slotted root); `viewportRef` stays internal for auto-scroll. If `PropsWithChildren` is now unused, drop it from the React import.

- [ ] **Step 5: Replace the `Logger.List` body (onto `Listbox`)**

Replace the entire `LoggerList` component (keep the `LoggerListProps` type and `displayName`) with:

```tsx
const LoggerList = ({ classNames }: LoggerListProps) => {
  const { t } = useTranslation(translationKey);
  const { rows, expanded, toggleExpand } = useLoggerContext('Logger.List');

  if (rows.length === 0) {
    return <div className={mx('p-2 text-subdued', classNames)}>{t('empty.message')}</div>;
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames={mx(classNames)}>
        {rows.map(({ id, entry }) => {
          const record = formatLogEntry(entry);
          const expandable = Boolean(record.context || record.error);
          return (
            <Listbox.Item key={id} id={String(id)} classNames='group px-1'>
              <div className='flex flex-col is-full'>
                <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                  <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
                  <div className='truncate text-subdued'>{record.file}</div>
                  <button
                    type='button'
                    aria-expanded={expandable ? expanded.has(id) : undefined}
                    className='truncate text-start cursor-pointer'
                    title={record.message}
                    onClick={() => toggleExpand(id)}
                  >
                    {record.message}
                  </button>
                  <IconButton
                    icon='ph--clipboard--regular'
                    iconOnly
                    density='xs'
                    label={t('copy-entry.label')}
                    variant='ghost'
                    classNames='p-0 opacity-50 group-hover:opacity-100'
                    onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                  />
                </div>
                {expanded.has(id) && expandable && (
                  <pre className='px-4 py-1 whitespace-pre-wrap text-subdued'>
                    {JSON.stringify({ context: record.context, error: record.error }, null, 2)}
                  </pre>
                )}
              </div>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};
```

Before finalizing, confirm `Listbox.Root`/`Content`/`Item` prop names against `packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx` (exports `Root`, `Content`, `Item`, `ItemLabel`, `ItemContent`, `Indicator`; `Item` takes `id` + `classNames`). If `Listbox.Content` does not accept `classNames`, move the class to `Listbox.Root`. Match the `ForeignKeys.tsx` usage.

- [ ] **Step 6: Build**

Run: `~/.proto/shims/moon run react-ui-debug:build`
Expected: PASS. Type-check confirms `composable()` signatures and the `Listbox`/`ComposableProps` usage. (If `composable`'s render props type doesn't expose `children` for Content, import and use `PropsWithChildren` in the generic: `composable<HTMLDivElement, PropsWithChildren>(...)` and type `LoggerContentProps = ComposableProps<PropsWithChildren>` — verify against `Empty.tsx`/`slots.ts`.)

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-debug/package.json packages/ui/react-ui-debug/src/components/Logger/Logger.tsx pnpm-lock.yaml
git commit -m "react-ui-debug: Logger.List on Listbox; composable Toolbar/Content"
```

---

### Task 8: `Logger.Levels` — per-file level popover

**Files:**

- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (replace the stub; add `Popover` import)

**Interfaces:** Consumes `useLoggerContext`, `LEVELS`, `files`, `fileLevels`, `setFileLevel`, `clearFileLevels`. Produces `LoggerLevels` (+ `LoggerLevelsProps`).

- [ ] **Step 1: Add `Popover` to the react-ui import** (insert `Popover,` after `Input,`).

- [ ] **Step 2: Replace the `LoggerLevels = () => null` stub**

```tsx
//
// Levels
//

export type LoggerLevelsProps = ThemedClassName<{}>;

const LoggerLevels = ({ classNames }: LoggerLevelsProps) => {
  const { t } = useTranslation(translationKey);
  const { files, fileLevels, setFileLevel, clearFileLevels } = useLoggerContext('Logger.Levels');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Toolbar.IconButton
          icon='ph--sliders--regular'
          iconOnly
          label={t('levels.label')}
          classNames={mx(fileLevels.size > 0 && 'text-primary-text', classNames)}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport classNames='is-[22rem] max-bs-[20rem] overflow-y-auto p-2'>
            <div className='flex items-center justify-between pb-1'>
              <span className='text-sm text-subdued'>{t('levels.title')}</span>
              <IconButton
                icon='ph--x--regular'
                iconOnly
                density='xs'
                variant='ghost'
                label={t('levels.clear')}
                disabled={fileLevels.size === 0}
                onClick={clearFileLevels}
              />
            </div>
            {files.length === 0 && <div className='p-1 text-xs text-subdued'>{t('levels.empty')}</div>}
            {files.length > 0 && (
              <Listbox.Root>
                <Listbox.Content>
                  {files.map((file) => {
                    const basename = file.split('/').pop() ?? file;
                    const value = fileLevels.get(file) ?? 'inherit';
                    return (
                      <Listbox.Item key={file} id={file} classNames='grid grid-cols-[1fr_7rem] items-center gap-1'>
                        <Listbox.ItemLabel classNames='text-xs' title={file}>
                          {basename}
                        </Listbox.ItemLabel>
                        <Select.Root
                          value={value}
                          onValueChange={(next) =>
                            setFileLevel(file, next === 'inherit' ? undefined : (next as LevelName))
                          }
                        >
                          <Select.TriggerButton classNames='is-full text-sm' placeholder={t('levels.inherit')} />
                          <Select.Portal>
                            <Select.Content>
                              <Select.ScrollUpButton />
                              <Select.Viewport>
                                <Select.Option value='inherit' classNames='text-sm'>
                                  {t('levels.inherit')}
                                </Select.Option>
                                {LEVELS.map((level) => (
                                  <Select.Option key={level} value={level} classNames='text-sm'>
                                    {t(`level.${level}`)}
                                  </Select.Option>
                                ))}
                              </Select.Viewport>
                              <Select.ScrollDownButton />
                              <Select.Arrow />
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </Listbox.Item>
                    );
                  })}
                </Listbox.Content>
              </Listbox.Root>
            )}
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

LoggerLevels.displayName = 'Logger.Levels';
```

(Uses the `'inherit'` sentinel rather than an empty-string Select value — Radix Select disallows `value=''`.)

- [ ] **Step 3: Build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx
git commit -m "react-ui-debug: add Logger.Levels per-file log-level popover"
```

---

### Task 8b: `Logger.Filter` — client-side text-match filter over the buffer

**What:** A text input (placed **below the list**, in `Panel.Statusbar`) that filters the buffered rows by a case-insensitive substring match on each entry's file + message. This is a **view filter over the buffer** — distinct from the toolbar's base-level `filter`, which controls `@dxos/log` capture/level. It changes nothing about what is captured; it only hides non-matching buffered rows.

**Files:**

- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (Root state, `Logger.List` filtering, new `Logger.Filter` part)
- Modify: `packages/ui/react-ui-debug/src/translations.ts` (`search.*` keys)

**Interfaces:** Adds `textFilter: string` + `setTextFilter: (value: string) => void` to `LoggerContextValue`. Adds `LoggerFilter` / `LoggerFilterProps` (`ComposableProps`).

- [ ] **Step 1: Add `textFilter` state to `Logger.Root`**

In `LoggerRoot`, add alongside the other `useState` hooks:

```tsx
const [textFilter, setTextFilter] = useState('');
```

Add `textFilter` and `setTextFilter` to the `LoggerContextValue` type and pass both on the `<LoggerProvider …>` element.

- [ ] **Step 2: Filter rows in `Logger.List`**

Replace the `Logger.List` body's row derivation so it computes each row's `record` once and applies the text filter (keep the `Listbox` structure from Task 7b):

```tsx
const LoggerList = ({ classNames }: LoggerListProps) => {
  const { t } = useTranslation(translationKey);
  const { rows, expanded, toggleExpand, textFilter } = useLoggerContext('Logger.List');

  // Compute the display record once; filter the buffer by a case-insensitive match on file + message.
  const needle = textFilter.trim().toLowerCase();
  const visible = rows
    .map((row) => ({ ...row, record: formatLogEntry(row.entry) }))
    .filter(({ record }) =>
      needle ? `${record.file ?? ''} ${record.message ?? ''}`.toLowerCase().includes(needle) : true,
    );

  if (visible.length === 0) {
    return (
      <div className={mx('p-2 text-subdued', classNames)}>
        {t(rows.length === 0 ? 'empty.message' : 'search.no-matches')}
      </div>
    );
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames={mx(classNames)}>
        {visible.map(({ id, entry, record }) => {
          const expandable = Boolean(record.context || record.error);
          return (
            <Listbox.Item key={id} id={String(id)} classNames='group px-1'>
              <div className='flex flex-col is-full'>
                <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                  <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
                  <div className='truncate text-subdued'>{record.file}</div>
                  <button
                    type='button'
                    aria-expanded={expandable ? expanded.has(id) : undefined}
                    className='truncate text-start cursor-pointer'
                    title={record.message}
                    onClick={() => toggleExpand(id)}
                  >
                    {record.message}
                  </button>
                  <IconButton
                    icon='ph--clipboard--regular'
                    iconOnly
                    density='xs'
                    label={t('copy-entry.label')}
                    variant='ghost'
                    classNames='p-0 opacity-50 group-hover:opacity-100'
                    onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                  />
                </div>
                {expanded.has(id) && expandable && (
                  <pre className='px-4 py-1 whitespace-pre-wrap text-subdued'>
                    {JSON.stringify({ context: record.context, error: record.error }, null, 2)}
                  </pre>
                )}
              </div>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

LoggerList.displayName = 'Logger.List';
```

- [ ] **Step 3: Add the `Logger.Filter` part** (after `Logger.List`)

```tsx
//
// Filter
//

export type LoggerFilterProps = ComposableProps;

const LoggerFilter = composable<HTMLDivElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { textFilter, setTextFilter } = useLoggerContext('Logger.Filter');

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
      <Input.Root>
        <Input.TextInput
          placeholder={t('search.placeholder')}
          value={textFilter}
          autoComplete='off'
          spellCheck={false}
          onChange={(ev) => setTextFilter(ev.target.value)}
        />
      </Input.Root>
      {textFilter.length > 0 && (
        <Toolbar.IconButton
          icon='ph--x--regular'
          iconOnly
          label={t('search.clear')}
          onClick={() => setTextFilter('')}
        />
      )}
    </Toolbar.Root>
  );
});

LoggerFilter.displayName = 'Logger.Filter';
```

- [ ] **Step 4: Translations** — add to `translations.ts` after the `levels.*` keys:

```ts
        'search.placeholder': 'Find in buffer…',
        'search.clear': 'Clear filter',
        'search.no-matches': 'No matching entries.',
```

- [ ] **Step 5: Build** — `~/.proto/shims/moon run react-ui-debug:build` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx packages/ui/react-ui-debug/src/translations.ts
git commit -m "react-ui-debug: add Logger.Filter (text-match filter over the log buffer)"
```

---

### Task 9: Namespace assembly + barrel

**Files:**

- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (namespace + exports)
- Create: `packages/ui/react-ui-debug/src/components/Logger/index.ts`
- Modify: `packages/ui/react-ui-debug/src/components/index.ts`

(`LogPanel` was already removed in Task 2.)

**Interfaces:** Produces `Logger = { Root, Toolbar, Content, List, Levels, Filter }` + all `Logger*Props`.

- [ ] **Step 1: Assemble the namespace at the end of `Logger.tsx`**

Replace the trailing `export { useLoggerContext };` with:

```tsx
//
// Logger
//

export const Logger = {
  Root: LoggerRoot,
  Toolbar: LoggerToolbar,
  Content: LoggerContent,
  List: LoggerList,
  Levels: LoggerLevels,
  Filter: LoggerFilter,
};

export { useLoggerContext };
export type {
  LoggerContentProps,
  LoggerFilterProps,
  LoggerLevelsProps,
  LoggerListProps,
  LoggerRootProps,
  LoggerToolbarProps,
};
```

- [ ] **Step 2: Create the barrel** `packages/ui/react-ui-debug/src/components/Logger/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Logger';
export * from './format';
```

- [ ] **Step 3: Point `components/index.ts` at Logger**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Logger';
```

- [ ] **Step 4: Confirm no stale references**

Run: `grep -rn "LogPanel" packages/ui/react-ui-debug/src`
Expected: no output.

- [ ] **Step 5: Build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui-debug/src
git commit -m "react-ui-debug: assemble Logger namespace + barrel"
```

---

### Task 10: Update consumers + rework story

**Files:**

- Modify: `packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx`
- Modify: `packages/plugins/plugin-debug/src/capabilities/react-surface.tsx`
- Modify: `packages/stories/storybook-testing/src/modules/LoggingModule.tsx`
- Modify: `packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx`
- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.stories.tsx`

**Interfaces:** Consumes `Logger` from `@dxos/react-ui-debug`; `Panel` (and `Toolbar` in the story) from `@dxos/react-ui`.

**All four `LogPanel` consumers must be migrated** (grep to confirm none remain: `grep -rn "LogPanel" packages/plugins/plugin-debug/src packages/devtools packages/stories/storybook-testing/src`). `stories-assistant/src/testing/decorators.tsx` only imports `@dxos/react-ui-debug/translations` (unchanged — leave it). Each site inlines the same assembly (`Logger.Root` → `Panel.Root` → Toolbar/Content(List)/Statusbar(Filter)); `Logger.Root` accepts `maxLines` / `initialFilter` / `defaultRecording`, and any container-sizing `classNames` moves onto the inner `Panel.Root`.

- [ ] **Step 1: Update `LogStatus.tsx`**

Replace `import { LogPanel } from '@dxos/react-ui-debug';` with `import { Logger } from '@dxos/react-ui-debug';`, add `Panel` to the `@dxos/react-ui` import, and replace `<LogPanel />` inside the `Popover.Viewport` with:

```tsx
<Logger.Root>
  <Panel.Root classNames='bs-full'>
    <Panel.Toolbar asChild>
      <Logger.Toolbar />
    </Panel.Toolbar>
    <Panel.Content asChild>
      <Logger.Content>
        <Logger.List />
      </Logger.Content>
    </Panel.Content>
    <Panel.Statusbar asChild>
      <Logger.Filter />
    </Panel.Statusbar>
  </Panel.Root>
</Logger.Root>
```

- [ ] **Step 2: Update `LoggingModule.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

/**
 * Renders the `@dxos/react-ui-debug` {@link Logger} composite — a live `@dxos/log` viewer with
 * level filter, per-file levels, a text-match buffer filter, and record controls — assembled as a story module.
 */
export const LoggingModule = () => (
  <Logger.Root>
    <Panel.Root classNames='bs-full'>
      <Panel.Toolbar asChild>
        <Logger.Toolbar />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Logger.Content>
          <Logger.List />
        </Logger.Content>
      </Panel.Content>
      <Panel.Statusbar asChild>
        <Logger.Filter />
      </Panel.Statusbar>
    </Panel.Root>
  </Logger.Root>
);
```

- [ ] **Step 2b: Update `plugin-debug/src/capabilities/react-surface.tsx`**

Replace `import { LogPanel } from '@dxos/react-ui-debug';` with `import { Logger } from '@dxos/react-ui-debug';`, ensure `Panel` is imported from `@dxos/react-ui` (add if absent), and replace the `logs` surface `component: () => <LogPanel />,` with:

```tsx
component: () => (
  <Logger.Root>
    <Panel.Root classNames='bs-full'>
      <Panel.Toolbar asChild>
        <Logger.Toolbar />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Logger.Content>
          <Logger.List />
        </Logger.Content>
      </Panel.Content>
      <Panel.Statusbar asChild>
        <Logger.Filter />
      </Panel.Statusbar>
    </Panel.Root>
  </Logger.Root>
),
```

- [ ] **Step 2c: Update `devtools/.../performance/panels/LoggingPanel.tsx`**

This file imports its own `Panel` from `'../Panel'`, so import the design-system panel **aliased** to avoid the clash. `Logger.Root` takes the former `LogPanel` props; the `classNames='bs-[280px]'` sizing moves onto the inner `UiPanel.Root`:

```tsx
//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Panel as UiPanel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

import { type CustomPanelProps, Panel } from '../Panel';

export const LoggingPanel = ({ maxLines = 100, ...props }: CustomPanelProps<{ maxLines?: number }>) => (
  <Panel {...props} icon='ph--list--regular' title='Logging' maxHeight={0}>
    <Logger.Root maxLines={maxLines} initialFilter='intent-dispatcher:debug' defaultRecording={false}>
      <UiPanel.Root classNames='bs-[280px]'>
        <UiPanel.Toolbar asChild>
          <Logger.Toolbar />
        </UiPanel.Toolbar>
        <UiPanel.Content asChild>
          <Logger.Content>
            <Logger.List />
          </Logger.Content>
        </UiPanel.Content>
        <UiPanel.Statusbar asChild>
          <Logger.Filter />
        </UiPanel.Statusbar>
      </UiPanel.Root>
    </Logger.Root>
  </Panel>
);
```

- [ ] **Step 3: Create `Logger.stories.tsx`**

First confirm the random helper name: `grep -n "arrayElement\|export" packages/common/random/src/index.ts` (or wherever `@dxos/random` exports). If `random.helpers.arrayElement` is absent, use `FILES[i % FILES.length]` keyed off a counter. Then create:

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Logger } from './Logger';

random.seed(123);

const FILES = ['alpha.ts', 'beta.ts', 'gamma.ts'];

// Hand-written meta so entries appear to originate from distinct files, populating the Levels list.
const emit = (file: string, level: 'info' | 'warn' | 'error') =>
  log[level](random.lorem.sentences(), {}, { F: file, L: 1 } as any);

const DefaultStory = () => (
  <Logger.Root initialFilter='info'>
    <Panel.Root classNames='bs-full'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {FILES.map((file) => (
            <Toolbar.Button key={file} onClick={() => emit(file, 'info')}>
              {file}
            </Toolbar.Button>
          ))}
          <Toolbar.Button onClick={() => emit(FILES[1], 'warn')}>Warn (beta)</Toolbar.Button>
          <Toolbar.Button onClick={() => emit(FILES[1], 'error')}>Error (beta)</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Panel.Root classNames='bs-full'>
          <Panel.Toolbar asChild>
            <Logger.Toolbar />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Logger.Content>
              <Logger.List />
            </Logger.Content>
          </Panel.Content>
          <Panel.Statusbar asChild>
            <Logger.Filter />
          </Panel.Statusbar>
        </Panel.Root>
      </Panel.Content>
    </Panel.Root>
  </Logger.Root>
);

const meta = {
  title: 'ui/react-ui-debug/Logger',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 4: Build + no stale refs**

```bash
grep -rn "LogPanel" packages/plugins/plugin-debug/src packages/devtools packages/stories/storybook-testing/src
~/.proto/shims/moon run react-ui-debug:build && ~/.proto/shims/moon run plugin-debug:build && ~/.proto/shims/moon run devtools:build
```

Expected: first command no output; all three builds PASS. (The `devtools` moon project id is `devtools`.)

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx packages/stories/storybook-testing/src/modules/LoggingModule.tsx packages/ui/react-ui-debug/src/components/Logger/Logger.stories.tsx
git commit -m "react-ui-debug: migrate LogStatus + storybook consumers to Logger composite"
```

---

### Task 11: Format, lint, and manual verification

**Files:** none (verification + any fixups).

- [ ] **Step 1: Format** — `pnpm format`; stage results.
- [ ] **Step 2: Lint** — `moon run react-ui-debug:lint -- --fix` and `moon run log:lint -- --fix` and `moon run vite-plugin-log:lint -- --fix`. Expected: PASS; fix import-order/naming issues.
- [ ] **Step 3: Tests** — `moon run log:test`, `moon run vite-plugin-log:test`, `moon run react-ui-debug:test`. Expected: PASS.
- [ ] **Step 4: Manual Storybook verification.** Reuse the user's server on :9009 (`curl -s localhost:9009 >/dev/null && echo up`); if down, start on a different port. Open `ui/react-ui-debug/Logger` → Default.
  1. Click `alpha.ts` / `beta.ts` / `gamma.ts` → info lines appear (base `info`).
  2. Open the Levels popover (sliders icon) → the three files listed (from the stream; registry too if the plugin is active in this storybook).
  3. Set `beta.ts` → `error`; click `beta.ts` (info) → suppressed; click `Error (beta)` → error line shows; other files' info still shows.
  4. Set `beta.ts` → `Inherit` → beta info reappears; `Reset all` clears overrides and the trigger loses its active color.
     Capture a screenshot with an override applied.
- [ ] **Step 5: Final format + commit fixups**

```bash
pnpm format && git status --short
git add -A && git commit -m "react-ui-debug: format and lint fixups for Logger composite"
```

---

## Self-Review

**Spec coverage:**

- Rename LogPanel → Logger composite (Root/Toolbar/Content/List/Levels) → Tasks 5–10. ✓
- Headless Root → Task 5. ✓
- `@dxos/log` dev registry, file-list-only, global `DX_LOG_FILES` → Task 3. ✓
- Module-load population via transform, dev-gated (`registerFiles: isServe`) → Task 4. ✓
- Root unions registry + stream → Task 5. ✓
- Per-file level UI (any/all) + composition → Tasks 6, 8. ✓
- Dedicated Levels popover → Task 8. ✓
- Consumers assemble parts → Task 10. ✓
- format.test.ts relocation (Task 1 gap) → Task 2. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. The "confirm the random helper name" note in Task 10 carries a concrete fallback.

**Type consistency:** `LevelName`, `LogRow`, `LoggerContextValue`, `composeFilter`, `setFileLevel(file, level|undefined)`, `logFileRegistry.{register,getFiles,subscribe,clear}`, `registerFiles` option, and `Logger.{Root,Toolbar,Content,List,Levels}` are used consistently across tasks. `useLoggerContext('<part>')` strings match each part's `displayName`.

```

```
