# Logger Composite + Per-File Log-Level Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `@dxos/react-ui-debug`'s `LogPanel` into a Radix-style composite `Logger` and add a UI to set a `@dxos/log` level for any individual file or all files.

**Architecture:** A headless `Logger.Root` provider owns all state (rows, base filter, recording, expanded set, per-file level map, discovered files) and side effects (the `log.addProcessor` subscription, ref-counted global-config ownership, and `log.config` calls). Presentational parts `Logger.Toolbar` / `Logger.Content` / `Logger.List` / `Logger.Levels` consume context. Per-file overrides are composed with the base filter into a single `@dxos/log` filter string; `@dxos/log`'s substring+level matching makes below-base overrides *raise* verbosity and above-base overrides *quiet* a file.

**Tech Stack:** React (arrow components, named imports), TypeScript, `@dxos/log`, `@dxos/react-ui` primitives (Panel, Toolbar, Select, Input, Popover, ScrollArea, IconButton, ToggleIconButton), `@radix-ui/react-context` / `react-slot` / `react-primitive`, TailwindCSS via `mx()`, Storybook, moon, oxfmt.

## Global Constraints

- **Branch safety:** only edit on the assigned `claude/…` branch; never on `main`.
- **No casts** (`as any`, `as unknown as T`, non-null `!`) to satisfy the type-checker; `as const` is fine.
- **Copyright header** `// Copyright 2026 DXOS.org //` on every new `.ts`/`.tsx` file (match existing files in the package).
- **Imports grouped** builtin → external → @dxos → internal → parent → sibling, blank line between groups. Named exports; no default exports.
- **React:** arrow-function components, named React imports (`useMemo`, `type Ref` — not `React.useMemo`); forwarded ref param named `forwardedRef`.
- **Composite idiom** (`composite-components` skill): internal names prefixed (`LoggerRoot`), dotted `displayName` (`'Logger.Root'`), every Props type exported, namespace assembled as an object literal, section comments between parts. **Deviation (approved):** classnames use `mx()` + Tailwind, not `tx()` theme tokens — the panel has no token file and a `logger.*` namespace owned from this package would be inappropriate coupling.
- **Workspace deps** use `workspace:*`; external deps added from the **catalog** (`pnpm add --filter '@dxos/react-ui-debug' --save-catalog …`). Do not hand-edit versions.
- **Format before commit:** run `pnpm format` and stage the result.
- **Per-file level map keys on `entry.meta?.F`** (the raw string `@dxos/log`'s `matchFilter` matches against); the basename (`key.split('/').pop()`) is display-only.
- **Level values are name strings** (`'trace'|'debug'|'verbose'|'info'|'warn'|'error'`) end-to-end — no `LogLevel`↔name conversion; the effective filter is a plain comma-joined string.

---

## File Structure

```
packages/ui/react-ui-debug/
  package.json                              # MODIFY: add 3 radix catalog deps
  src/
    translations.ts                         # MODIFY: add levels.* keys
    components/
      index.ts                              # MODIFY: export ./Logger (was ./LogPanel)
      Logger/                               # NEW dir (replaces LogPanel/)
        Logger.tsx                          # NEW: composite (Root/Toolbar/Content/List/Levels)
        format.ts                           # MOVED verbatim from LogPanel/format.ts
        index.ts                            # NEW: barrel
        Logger.stories.tsx                  # NEW: reworked story
packages/plugins/plugin-debug/
  src/containers/LogStatus/LogStatus.tsx    # MODIFY: assemble Logger parts
packages/stories/storybook-testing/
  src/modules/LoggingModule.tsx             # MODIFY: assemble Logger parts
```

Deleted: `packages/ui/react-ui-debug/src/components/LogPanel/` (all three files).

---

### Task 1: Package deps + move `format.ts` + scaffold `Logger` dir

**Files:**
- Modify: `packages/ui/react-ui-debug/package.json`
- Create: `packages/ui/react-ui-debug/src/components/Logger/format.ts` (moved)
- Delete: `packages/ui/react-ui-debug/src/components/LogPanel/format.ts`

**Interfaces:**
- Produces: `formatLogEntry(entry: LogEntry): LogRecord` and `type LogRecord` from `./format` (unchanged content, new path).

- [ ] **Step 1: Add the three radix deps from the catalog**

Run:
```bash
pnpm add --filter '@dxos/react-ui-debug' --save-catalog @radix-ui/react-context @radix-ui/react-slot @radix-ui/react-primitive
```
Expected: `package.json` `dependencies` gains the three `@radix-ui/react-*` entries at `catalog:`; lockfile updates. If a package is not in the catalog, the command adds it there.

- [ ] **Step 2: Move `format.ts` into the new `Logger/` dir**

Run:
```bash
mkdir -p packages/ui/react-ui-debug/src/components/Logger
git mv packages/ui/react-ui-debug/src/components/LogPanel/format.ts packages/ui/react-ui-debug/src/components/Logger/format.ts
```
Expected: `format.ts` now under `Logger/`; content unchanged.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-debug/package.json pnpm-lock.yaml pnpm-workspace.yaml packages/ui/react-ui-debug/src/components/Logger/format.ts
git commit -m "react-ui-debug: add radix composite deps; relocate log format helper"
```

---

### Task 2: `Logger.Root` — headless provider with state, discovery, and filter composition

**Files:**
- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (Root only for this task; later tasks append parts to the same file)

**Interfaces:**
- Consumes: `formatLogEntry` from `./format`.
- Produces (used by all later parts via `useLoggerContext('<part>')`):
  ```ts
  type LevelName = 'trace' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';
  type LogRow = { id: number; entry: LogEntry };
  type LoggerContextValue = {
    rows: LogRow[];
    filter: string;                                   // base filter text
    setFilter: (filter: string) => void;
    recording: boolean;
    setRecording: (fn: (value: boolean) => boolean) => void;
    files: string[];                                  // sorted unique entry.meta.F seen
    fileLevels: Map<string, LevelName>;
    setFileLevel: (file: string, level: LevelName | undefined) => void;  // undefined clears
    clearFileLevels: () => void;
    expanded: Set<number>;
    toggleExpand: (id: number) => void;
    clear: () => void;
    copyAll: () => void;
  };
  ```
  Also produces the shared constants `LEVELS`, `levelColor`, and the exported `LoggerRootProps`.

- [ ] **Step 1: Write `Logger.tsx` with the Root provider**

Create `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, shouldLog } from '@dxos/log';

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
const composeFilter = (base: string, fileLevels: Map<string, LevelName>): string =>
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
  const [files, setFiles] = useState<string[]>([]);

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
        setFiles((prev) => (prev.includes(file) ? prev : [...prev, file].sort()));
      }
      if (shouldLog(entry, config.filters)) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacity));
      }
    });

    return () => dispose();
  }, [recording, effectiveFilter, capacity]);

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
    copyToClipboard(JSON.stringify(rows.map(({ entry }) => formatLogEntry(entry)), null, 2));
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

//
// Logger (namespace assembled in a later task)
//

export { useLoggerContext };
```

- [ ] **Step 2: Verify it type-checks**

Run: `moon run react-ui-debug:build`
Expected: PASS (Root compiles; no parts referenced yet). If `createContext` typing complains about the tuple, confirm the import is from `@radix-ui/react-context` (not React).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx
git commit -m "react-ui-debug: add headless Logger.Root with file discovery and filter composition"
```

---

### Task 2b: Unit-test the filter composition

**Files:**
- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (export `composeFilter`)
- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts`

**Interfaces:**
- Consumes: `composeFilter(base: string, fileLevels: Map<string, LevelName>): string`.

- [ ] **Step 1: Export `composeFilter`**

In `Logger.tsx`, change `const composeFilter` to `export const composeFilter`.

- [ ] **Step 2: Write the failing test**

Create `packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { shouldLog, LogLevel, parseFilter } from '@dxos/log';

import { composeFilter, type LevelName } from './Logger';

const entry = (level: LogLevel, file: string) => ({ level, meta: { F: file } }) as any;

describe('composeFilter', () => {
  test('base only when no overrides', () => {
    expect(composeFilter('info', new Map())).toBe('info');
  });

  test('appends per-file overrides', () => {
    const map = new Map<string, LevelName>([['a.ts', 'debug'], ['b.ts', 'error']]);
    expect(composeFilter('info', map)).toBe('info, a.ts:debug, b.ts:error');
  });

  test('override below base raises verbosity for that file only', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'debug']])));
    expect(shouldLog(entry(LogLevel.DEBUG, 'a.ts'), filters)).toBe(true); // raised
    expect(shouldLog(entry(LogLevel.DEBUG, 'b.ts'), filters)).toBe(false); // still gated by base
  });

  test('override above base quiets that file', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'error']])));
    expect(shouldLog(entry(LogLevel.INFO, 'a.ts'), filters)).toBe(false); // quieted
    expect(shouldLog(entry(LogLevel.ERROR, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.INFO, 'b.ts'), filters)).toBe(true); // base unaffected
  });
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `moon run react-ui-debug:test -- src/components/Logger/Logger.test.ts`
Expected: PASS (4 tests). This is the behavioral proof of the composition semantics.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx packages/ui/react-ui-debug/src/components/Logger/Logger.test.ts
git commit -m "react-ui-debug: test Logger filter composition raise/quiet semantics"
```

---

### Task 3: `Logger.Toolbar`, `Logger.Content`, `Logger.List` presentational parts

**Files:**
- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (append parts; add imports)
- Modify: `packages/ui/react-ui-debug/src/translations.ts` (levels keys — done here so the Toolbar's Levels button label resolves)

**Interfaces:**
- Consumes: `useLoggerContext`, `LEVELS`, `levelColor`, `copyToClipboard`, `formatLogEntry`.
- Produces: `LoggerToolbar`, `LoggerContent`, `LoggerList` (+ Props types). The Toolbar renders the Levels popover **trigger**; the popover **content** (`Logger.Levels`) is added in Task 4 — for this task the trigger is a plain `IconButton` placeholder wrapped so Task 4 only swaps its surrounding `Popover`.

- [ ] **Step 1: Add translation keys**

In `packages/ui/react-ui-debug/src/translations.ts`, add inside the `[translationKey]` object (after `'copy-entry.label'`):

```ts
        'levels.label': 'Log levels',
        'levels.title': 'Per-file log levels',
        'levels.clear': 'Reset all',
        'levels.inherit': 'Inherit',
        'levels.empty': 'No files have logged yet.',
```

- [ ] **Step 2: Extend imports at the top of `Logger.tsx`**

Add (react-ui named imports, merged into a single grouped import block):

```tsx
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
```
and replace the `@dxos/log`-only external group by also importing from `@dxos/react-ui` and `@dxos/ui-theme`:
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
(Keep import groups ordered: external radix → `@dxos/log` → `@dxos/react-ui` → `@dxos/ui-theme` → parent `../../translations` → sibling `./format`.)

- [ ] **Step 3: Append the Toolbar part**

Append to `Logger.tsx` (before the namespace section):

```tsx
//
// Toolbar
//

export type LoggerToolbarProps = ThemedClassName<{}>;

const LoggerToolbar = ({ classNames }: LoggerToolbarProps) => {
  const { t } = useTranslation(translationKey);
  const { filter, setFilter, recording, setRecording, fileLevels, clear, copyAll } = useLoggerContext('Logger.Toolbar');

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
```

Note: `<LoggerLevels />` (the popover trigger+content) is defined in Task 4. To keep this task independently buildable, add a temporary stub immediately below the Toolbar:

```tsx
// Temporary stub — replaced by the full Levels popover in the next task.
const LoggerLevels = () => null;
LoggerLevels.displayName = 'Logger.Levels';
```

- [ ] **Step 4: Append the Content part**

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

- [ ] **Step 5: Append the List part (rows extracted from today's `LogPanel`)**

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

- [ ] **Step 6: Verify build**

Run: `moon run react-ui-debug:build`
Expected: PASS. (Slot/Primitive imported but currently unused is fine only if referenced; if the build errors on unused imports, defer the `Slot`/`Primitive` import to Task 5 where `asChild` uses them — see Task 5 Step 1.)

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx packages/ui/react-ui-debug/src/translations.ts
git commit -m "react-ui-debug: add Logger Toolbar/Content/List parts and levels translations"
```

---

### Task 4: `Logger.Levels` — per-file level popover

**Files:**
- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (replace the `LoggerLevels` stub with the real part; add `Popover` to the `@dxos/react-ui` import)

**Interfaces:**
- Consumes: `useLoggerContext`, `LEVELS`, `files`, `fileLevels`, `setFileLevel`, `clearFileLevels`.
- Produces: `LoggerLevels` (+ `LoggerLevelsProps`). Replaces the Task 3 stub; still referenced as `<LoggerLevels />` inside the Toolbar.

- [ ] **Step 1: Add `Popover` to the react-ui import** in `Logger.tsx` (insert `Popover,` into the named import block, keeping alpha order after `Input`).

- [ ] **Step 2: Replace the stub with the real Levels part**

Delete the temporary `LoggerLevels = () => null` stub and add:

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
            {files.map((file) => {
              const basename = file.split('/').pop() ?? file;
              const value = fileLevels.get(file) ?? '';
              return (
                <div key={file} className='grid grid-cols-[1fr_7rem] items-center gap-1 py-0.5'>
                  <span className='truncate text-xs' title={file}>
                    {basename}
                  </span>
                  <Select.Root
                    value={value}
                    onValueChange={(next) => setFileLevel(file, next === '' ? undefined : (next as LevelName))}
                  >
                    <Select.TriggerButton classNames='is-full text-sm' placeholder={t('levels.inherit')} />
                    <Select.Portal>
                      <Select.Content>
                        <Select.ScrollUpButton />
                        <Select.Viewport>
                          <Select.Option value='' classNames='text-sm'>
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
                </div>
              );
            })}
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

LoggerLevels.displayName = 'Logger.Levels';
```

Note: verify `Select.Option value=''` is accepted (empty string is falsy but valid). If the underlying Radix Select rejects an empty-string value, use the sentinel `'inherit'` instead and map it: `value={fileLevels.get(file) ?? 'inherit'}` and `onValueChange={(next) => setFileLevel(file, next === 'inherit' ? undefined : (next as LevelName))}`. Confirm by grepping an existing `Select.Option value=''` in the repo before choosing; default to the `'inherit'` sentinel if none exists.

- [ ] **Step 3: Verify build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-debug/src/components/Logger/Logger.tsx
git commit -m "react-ui-debug: add Logger.Levels per-file log-level popover"
```

---

### Task 5: Namespace assembly, barrel, and delete `LogPanel`

**Files:**
- Modify: `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx` (namespace object + exports)
- Create: `packages/ui/react-ui-debug/src/components/Logger/index.ts`
- Modify: `packages/ui/react-ui-debug/src/components/index.ts`
- Delete: `packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.tsx`, `LogPanel.stories.tsx`, `index.ts`

**Interfaces:**
- Produces: `Logger = { Root, Toolbar, Content, List, Levels }` and all `Logger*Props`; barrel re-exports `./Logger` and `./format`.

- [ ] **Step 1: Assemble the namespace at the end of `Logger.tsx`**

Replace the trailing `export { useLoggerContext };` section with:

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
};

export { useLoggerContext };
export type { LoggerContentProps, LoggerLevelsProps, LoggerListProps, LoggerRootProps, LoggerToolbarProps };
```

(If any earlier `export type`/`export` on the individual Props caused duplicate-export errors, keep the declarations un-exported at definition and export them only in this block.)

- [ ] **Step 2: Confirm `asChild`/Slot usage**

The parts above render fixed primitives (`Toolbar.Root`, `ScrollArea.Root`, `div`) and do not need `asChild`. Remove the `Slot`/`Primitive` imports added in Task 3 Step 2 **if unused** to keep the build clean. (This composite is namespaced but not slot-forwarding; that matches the "consumers assemble" decision and the Panel wrapper supplies layout.)

- [ ] **Step 3: Create the barrel**

Create `packages/ui/react-ui-debug/src/components/Logger/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Logger';
export * from './format';
```

- [ ] **Step 4: Point `components/index.ts` at Logger**

Replace `packages/ui/react-ui-debug/src/components/index.ts` body:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Logger';
```

- [ ] **Step 5: Delete the old `LogPanel` files**

Run:
```bash
git rm packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.tsx \
       packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.stories.tsx \
       packages/ui/react-ui-debug/src/components/LogPanel/index.ts
```
Expected: `LogPanel/` dir removed (its `format.ts` was already moved in Task 1).

- [ ] **Step 6: Verify no stale references**

Run: `grep -rn "LogPanel" packages/ui/react-ui-debug/src`
Expected: no output.

- [ ] **Step 7: Build**

Run: `moon run react-ui-debug:build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/react-ui-debug/src
git commit -m "react-ui-debug: assemble Logger namespace; remove LogPanel"
```

---

### Task 6: Update consumers + rework the story

**Files:**
- Modify: `packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx`
- Modify: `packages/stories/storybook-testing/src/modules/LoggingModule.tsx`
- Create: `packages/ui/react-ui-debug/src/components/Logger/Logger.stories.tsx`

**Interfaces:**
- Consumes: `Logger` from `@dxos/react-ui-debug`; `Panel`, `Toolbar` from `@dxos/react-ui`.

- [ ] **Step 1: Update `LogStatus.tsx`**

Replace the `import { LogPanel } from '@dxos/react-ui-debug';` with `import { Logger } from '@dxos/react-ui-debug';` and add `Panel` to the `@dxos/react-ui` import. Replace `<LogPanel />` inside the viewport with:

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
 * filter, per-file level, and record controls — assembled as a story module.
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
    </Panel.Root>
  </Logger.Root>
);
```

- [ ] **Step 3: Create the reworked story**

Create `packages/ui/react-ui-debug/src/components/Logger/Logger.stories.tsx`:

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

// Hand-written meta so entries appear to originate from distinct files, populating the Levels list.
const emit = (file: string, level: 'info' | 'warn' | 'error') =>
  log[level](random.lorem.sentences(), {}, { F: file, L: 1 } as any);

const FILES = ['alpha.ts', 'beta.ts', 'gamma.ts'];

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
          <Toolbar.Button onClick={() => emit(random.helpers.arrayElement(FILES), 'warn')}>Warn</Toolbar.Button>
          <Toolbar.Button onClick={() => emit(random.helpers.arrayElement(FILES), 'error')}>Error</Toolbar.Button>
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

Note: confirm `random.helpers.arrayElement` exists in `@dxos/random`; if not, use `FILES[Math.floor(...)]` alternative already seeded, or `random.number({ min: 0, max: FILES.length - 1 })`. Grep `@dxos/random` exports before finalizing.

- [ ] **Step 4: Verify build + no stale refs**

Run:
```bash
grep -rn "LogPanel" packages/plugins/plugin-debug/src packages/stories/storybook-testing/src
moon run react-ui-debug:build && moon run plugin-debug:build
```
Expected: first command no output; builds PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx packages/stories/storybook-testing/src/modules/LoggingModule.tsx packages/ui/react-ui-debug/src/components/Logger/Logger.stories.tsx
git commit -m "react-ui-debug: migrate LogStatus + storybook consumers to Logger composite"
```

---

### Task 7: Format, lint, and manual Storybook verification

**Files:** none (verification only, plus any format/lint fixups).

- [ ] **Step 1: Format**

Run: `pnpm format`
Expected: files reformatted; stage them.

- [ ] **Step 2: Lint the package**

Run: `moon run react-ui-debug:lint -- --fix`
Expected: PASS (no errors). Fix any import-order or naming issues surfaced.

- [ ] **Step 3: Test**

Run: `moon run react-ui-debug:test`
Expected: PASS (includes `Logger.test.ts`).

- [ ] **Step 4: Manual verification in Storybook**

Reuse the user's server on :9009 (do not kill it): `curl -s localhost:9009 >/dev/null && echo up`. If down, start on a different port: `moon run storybook-react:serve` (or `-- --port 9010`). Open `ui/react-ui-debug/Logger` → Default.

Verify:
1. Click `alpha.ts` / `beta.ts` / `gamma.ts` → info lines appear (base `info`).
2. Open the Levels popover (sliders icon) → all three files listed.
3. Set `alpha.ts` → `debug`; the base filter shows `info`. Emit from alpha (there is no debug button, so temporarily lower the base to `trace`… — instead verify quiet path, which is observable with the existing buttons):
   - Set `beta.ts` → `error`. Click `beta.ts` (info) → **suppressed**; click Error until beta is chosen → its error line shows. Other files' info still shows.
   - Set `beta.ts` → `Inherit` → its info lines appear again.
4. Confirm the Levels trigger shows the active-state color while any override is set, and `Reset all` clears overrides.

Capture a screenshot of the panel with an override applied (`computer` screenshot) to attach as proof.

- [ ] **Step 5: Final format check + commit any fixups**

Run: `pnpm format && git status --short`
Expected: clean or staged fixups.

```bash
git add -A
git commit -m "react-ui-debug: format and lint fixups for Logger composite"
```

---

## Self-Review

**Spec coverage:**
- Rename LogPanel → Logger composite (Root/Toolbar/Content/List) → Tasks 2–5. ✓
- Headless Root → Task 2. ✓
- Per-file level feature (any/all) → Levels part (Task 4) + composition (Task 2/2b). ✓
- Files from live stream → Task 2 discovery in processor. ✓
- Dedicated Levels section + popover → Task 4. ✓
- Consumers assemble parts → Task 6. ✓
- Keep in react-ui-debug → all tasks in-package. ✓
- Testing/verification → Task 2b (unit) + Task 7 (build/lint/story). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. The two "confirm before choosing" notes (empty-string Select value; `random` helper name) are explicit fallbacks with concrete alternatives, not placeholders.

**Type consistency:** `LevelName`, `LogRow`, `LoggerContextValue`, `composeFilter`, `setFileLevel(file, level|undefined)`, `Logger.{Root,Toolbar,Content,List,Levels}` used consistently across Tasks 2–6. Context accessor `useLoggerContext('<part>')` string matches each part's `displayName`.
