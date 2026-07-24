# react-ui-debug Log Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Factor the devtools `LoggingPanel` into a reusable `@dxos/react-ui-debug` `<LogPanel>` and consume it from devtools and a new `plugin-debug` R0 button/popover + companion, so we can watch `@dxos/log` output in-app without DevTools.

**Architecture:** New private UI package `@dxos/react-ui-debug` exports a presentational `<LogPanel>` (gated capture via `log.config` + `shouldLog`, rolling most-recent buffer, filter/level/record/reset/copy toolbar, compact-expand rows) built on the `@dxos/react-ui` `Panel` primitive. Devtools' performance `LoggingPanel` becomes a thin wrapper; its `Panel.tsx` is reimplemented on the same primitive. `plugin-debug` adds an R0 companion surface and a status-bar popover.

**Tech Stack:** TypeScript, React (arrow components, named imports), `@dxos/log`, `@dxos/react-ui` primitives (`Panel`, `Toolbar`, `Input`, `Select`, `IconButton`, `ToggleIconButton`, `Popover`, `ScrollArea`), `@dxos/ui-theme` tokens, moon + vite build, storybook + `ts-test-storybook`.

## Global Constraints

- New package MUST set `"private": true` in `package.json`.
- In-repo deps use `workspace:*`; `peerDependencies` use `workspace:^`. Catalog only for external packages.
- Copyright header `// Copyright 2026 DXOS.org //` at top of every new file.
- TypeScript single quotes; named exports; arrow-function components; named React imports (`useMemo`, not `React.useMemo`); ref param named `forwardedRef`.
- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`). `as const` is fine.
- Comments state *why* in one clause, ending with a period. No history/narration.
- Never leave compatibility re-exports/shims when moving code — update every call site.
- Import order groups (blank line between): builtin → external → @dxos → internal → parent → sibling.
- Run `pnpm format` (oxfmt) and stage before every commit.
- Test after every task: `moon run <package>:build` (and `:test` where present) must pass.

## File Structure

**Create — `packages/ui/react-ui-debug/`:**
- `package.json` — private package manifest.
- `moon.yml` — library tags.
- `tsconfig.json` — project references.
- `vite.config.ts` — build entries (index, translations).
- `.storybook/main.mts`, `.storybook/preview.mts` — storybook config.
- `src/index.ts` — barrel.
- `src/translations.ts` — i18n namespace.
- `src/components/index.ts` — components barrel.
- `src/components/LogPanel/index.ts` — component barrel.
- `src/components/LogPanel/LogPanel.tsx` — the panel.
- `src/components/LogPanel/format.ts` — `formatLogEntry` pure helper + `LogRecord` type.
- `src/components/LogPanel/format.test.ts` — unit tests for the helper.
- `src/components/LogPanel/LogPanel.stories.tsx` — storybook + interaction test.

**Modify — devtools:**
- `packages/devtools/devtools/package.json` — add `@dxos/react-ui-debug` dep.
- `packages/devtools/devtools/tsconfig.json` — add project reference.
- `packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx` — thin wrapper.
- `packages/devtools/devtools/src/components/performance/Panel.tsx` — reimplement on `@dxos/react-ui` `Panel`.

**Modify — plugin-debug:**
- `packages/plugins/plugin-debug/package.json` — add `@dxos/react-ui-debug` dep.
- `packages/plugins/plugin-debug/tsconfig.json` — add project reference.
- `packages/plugins/plugin-debug/src/capabilities/app-graph-builder.ts` — `logs` deck companion.
- `packages/plugins/plugin-debug/src/capabilities/react-surface.tsx` — companion surface + status popover surface.
- `packages/plugins/plugin-debug/src/containers/LogStatus/{index.ts,LogStatus.tsx}` — create status button + popover.
- `packages/plugins/plugin-debug/src/containers/index.ts` — export `LogStatus`.
- `packages/plugins/plugin-debug/src/translations.ts` — add `logs.label`, `open-logs.label`.

---

### Task 1: Scaffold `@dxos/react-ui-debug` package

**Files:**
- Create: `packages/ui/react-ui-debug/package.json`
- Create: `packages/ui/react-ui-debug/moon.yml`
- Create: `packages/ui/react-ui-debug/tsconfig.json`
- Create: `packages/ui/react-ui-debug/vite.config.ts`
- Create: `packages/ui/react-ui-debug/.storybook/main.mts`
- Create: `packages/ui/react-ui-debug/.storybook/preview.mts`
- Create: `packages/ui/react-ui-debug/src/index.ts`
- Create: `packages/ui/react-ui-debug/src/translations.ts`
- Create: `packages/ui/react-ui-debug/src/components/index.ts`

**Interfaces:**
- Produces: package `@dxos/react-ui-debug` with exports `.` and `./translations`; `translationKey = '@dxos/react-ui-debug'`; `translations` array.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@dxos/react-ui-debug",
  "version": "0.10.0",
  "description": "In-app @dxos/log viewer (LogPanel).",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "private": true,
  "type": "module",
  "imports": { "#translations": "./src/translations.ts" },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "import": "./dist/lib/index.mjs"
    },
    "./translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "import": "./dist/lib/translations.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/log": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*"
  },
  "devDependencies": {
    "@dxos/storybook-utils": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:^",
    "@dxos/ui-theme": "workspace:^",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- [ ] **Step 2: Write `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-vite-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/*.ts"],
  "references": [
    { "path": "../../common/log" },
    { "path": "../react-ui" },
    { "path": "../ui-theme" }
  ]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
```

- [ ] **Step 5: Write `.storybook/main.mts` and `.storybook/preview.mts`**

`.storybook/main.mts`:
```ts
//
// Copyright 2026 DXOS.org
//

import { createConfig } from '../../../../tools/storybook-react/.storybook/main.ts';

export const stories = ['../src/**/*.stories.tsx'];

export default createConfig({ stories });
```

`.storybook/preview.mts`:
```ts
//
// Copyright 2026 DXOS.org
//

import { preview } from '../../../../tools/storybook-react/.storybook/preview.ts';

export * from '../../../../tools/storybook-react/.storybook/preview.ts';
export default preview;
```

- [ ] **Step 6: Write `src/translations.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-debug';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'filter.placeholder': 'Filter (e.g. space-proxy:debug)',
        'level.label': 'Level',
        'record.label': 'Record',
        'clear.label': 'Clear',
        'copy.label': 'Copy log',
        'copy-entry.label': 'Copy entry',
        'empty.message': 'No log entries.',
        'level.trace': 'Trace',
        'level.debug': 'Debug',
        'level.verbose': 'Verbose',
        'level.info': 'Info',
        'level.warn': 'Warn',
        'level.error': 'Error',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 7: Write `src/components/index.ts` and `src/index.ts`**

`src/components/index.ts`:
```ts
//
// Copyright 2026 DXOS.org
//
```
(empty barrel for now — LogPanel export added in Task 2.)

`src/index.ts`:
```ts
//
// Copyright 2026 DXOS.org
//

export * from './components';
```

- [ ] **Step 8: Install and build**

Run: `pnpm install`
Then: `moon run react-ui-debug:build`
Expected: build succeeds (empty component barrel is fine; translations compiles).

- [ ] **Step 9: Format and commit**

```bash
pnpm format
git add packages/ui/react-ui-debug pnpm-lock.yaml
git commit -m "react-ui-debug: scaffold package"
```

---

### Task 2: Implement `<LogPanel>` + `formatLogEntry`

**Files:**
- Create: `packages/ui/react-ui-debug/src/components/LogPanel/format.ts`
- Create: `packages/ui/react-ui-debug/src/components/LogPanel/format.test.ts`
- Create: `packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.tsx`
- Create: `packages/ui/react-ui-debug/src/components/LogPanel/index.ts`
- Create: `packages/ui/react-ui-debug/src/components/LogPanel/LogPanel.stories.tsx`
- Modify: `packages/ui/react-ui-debug/src/components/index.ts`

**Interfaces:**
- Consumes: from `@dxos/log` — `log`, `shouldLog`, `shortLevelName`, `LogLevel`, `LogEntry`, `type LogConfig`. From `@dxos/react-ui` — `Panel`, `Toolbar`, `Input`, `Select`, `IconButton`, `ScrollArea`, `useTranslation`, `type ThemedClassName`. From `@dxos/ui-theme` — `mx`.
- Produces: `formatLogEntry(entry: LogEntry): LogRecord`; `type LogRecord`; `<LogPanel>` with `type LogPanelProps = ThemedClassName<{ maxLines?: number; initialFilter?: string; defaultRecording?: boolean }>`.

- [ ] **Step 1: Write the failing test — `format.test.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogEntry, LogLevel } from '@dxos/log';

import { formatLogEntry } from './format';

describe('formatLogEntry', () => {
  test('extracts level letter, file basename, message and context', () => {
    const entry = new LogEntry({
      level: LogLevel.INFO,
      message: 'hello',
      context: { count: 3 },
      meta: { F: '/repo/packages/foo/src/bar.ts', L: 42, S: undefined },
      timestamp: 0,
    });

    const record = formatLogEntry(entry);
    expect(record.level).to.equal('I');
    expect(record.file).to.equal('bar.ts');
    expect(record.line).to.equal(42);
    expect(record.message).to.equal('hello');
    expect(record.context).to.deep.equal({ count: 3 });
    expect(record.error).to.be.undefined;
  });

  test('omits empty context', () => {
    const entry = new LogEntry({ level: LogLevel.DEBUG, message: 'x', context: {}, timestamp: 0 });
    expect(formatLogEntry(entry).context).to.be.undefined;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `moon run react-ui-debug:test -- format.test.ts`
Expected: FAIL — `formatLogEntry` is not defined / module missing.

- [ ] **Step 3: Implement `format.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type LogEntry, shortLevelName } from '@dxos/log';

/**
 * Serializable projection of a {@link LogEntry} for display and clipboard export.
 */
export type LogRecord = {
  timestamp: string;
  level: string;
  file?: string;
  line?: number;
  message?: string;
  context?: Record<string, unknown>;
  error?: string;
};

/** Flattens a log entry into a JSON-safe record via the entry's computed getters. */
export const formatLogEntry = (entry: LogEntry): LogRecord => {
  const context = entry.computedContext;
  return {
    timestamp: new Date(entry.timestamp).toISOString(),
    level: shortLevelName[entry.level],
    file: entry.computedMeta.filename?.split('/').pop(),
    line: entry.computedMeta.line,
    message: entry.message,
    context: Object.keys(context).length > 0 ? context : undefined,
    error: entry.computedError,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `moon run react-ui-debug:test -- format.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `LogPanel.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, log, shouldLog } from '@dxos/log';
import {
  IconButton,
  Input,
  Panel,
  ScrollArea,
  Select,
  type ThemedClassName,
  ToggleIconButton,
  Toolbar,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatLogEntry } from './format';
import { translationKey } from '../../translations';

const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;

const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

export type LogPanelProps = ThemedClassName<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

/**
 * In-app viewer for the live `@dxos/log` stream — filter, set level, record/pause,
 * clear, and copy without opening DevTools.
 */
export const LogPanel = ({
  classNames,
  maxLines = 1000,
  initialFilter = 'info',
  defaultRecording = true,
}: LogPanelProps) => {
  const { t } = useTranslation(translationKey);
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<LogEntry>>(new Set());

  // Register a processor while recording; the filter drives the global config so it also sets the logging level.
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      if (shouldLog(entry, config.filters)) {
        setEntries((prev) => [...prev, entry].slice(-maxLines));
      }
    });

    return () => dispose();
  }, [recording, filter, maxLines]);

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [entries]);

  const handleClear = useCallback(() => setEntries([]), []);
  const handleCopyAll = useCallback(() => {
    void navigator.clipboard?.writeText(JSON.stringify(entries.map(formatLogEntry), null, 2));
  }, [entries]);
  const handleToggleExpand = useCallback((entry: LogEntry) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(entry) ? next.delete(entry) : next.add(entry);
      return next;
    });
  }, []);

  // A bare level matching the filter selects it; a scoped filter shows no selection.
  const selectedLevel = (LEVELS as readonly string[]).includes(filter) ? filter : '';

  return (
    <Panel.Root classNames={mx('bs-full', classNames)}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              placeholder={t('filter.placeholder')}
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
            />
          </Input.Root>
          <Select.Root value={selectedLevel} onValueChange={setFilter}>
            <Select.TriggerButton classNames='text-sm' placeholder={t('level.label')} />
            <Select.Content>
              {LEVELS.map((level) => (
                <Select.Option key={level} value={level} classNames='text-sm'>
                  {t(`level.${level}`)}
                </Select.Option>
              ))}
              <Select.Arrow />
            </Select.Content>
          </Select.Root>
          <ToggleIconButton
            pressed={recording}
            icon='ph--record--regular'
            activeIcon='ph--pause--regular'
            iconOnly
            label={t('record.label')}
            onClick={() => setRecording((value) => !value)}
          />
          <Toolbar.IconButton icon='ph--eraser--regular' iconOnly label={t('clear.label')} onClick={handleClear} />
          <Toolbar.IconButton icon='ph--clipboard--regular' iconOnly label={t('copy.label')} onClick={handleCopyAll} />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport ref={viewportRef} classNames='text-xs'>
            {entries.length === 0 && <div className='p-2 text-subdued'>{t('empty.message')}</div>}
            {entries.map((entry, index) => {
              const record = formatLogEntry(entry);
              return (
                <div key={index} className='group px-1'>
                  <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                    <div className={levelColor(entry.level)}>{record.level}</div>
                    <div className='truncate text-subdued'>{record.file}</div>
                    <div
                      className='truncate cursor-pointer'
                      title={record.message}
                      onClick={() => handleToggleExpand(entry)}
                    >
                      {record.message}
                    </div>
                    <IconButton
                      icon='ph--clipboard--regular'
                      iconOnly
                      label={t('copy-entry.label')}
                      variant='ghost'
                      classNames='opacity-50 group-hover:opacity-100'
                      onClick={() => void navigator.clipboard?.writeText(JSON.stringify(record, null, 2))}
                    />
                  </div>
                  {expanded.has(entry) && (record.context || record.error) && (
                    <pre className='px-4 py-1 whitespace-pre-wrap text-subdued'>
                      {JSON.stringify({ context: record.context, error: record.error }, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 6: Write `LogPanel/index.ts` and update `components/index.ts`**

`LogPanel/index.ts`:
```ts
//
// Copyright 2026 DXOS.org
//

export * from './LogPanel';
export * from './format';
```

`components/index.ts`:
```ts
//
// Copyright 2026 DXOS.org
//

export * from './LogPanel';
```

- [ ] **Step 7: Write `LogPanel.stories.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';
import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withStorybookGlobals } from '@dxos/storybook-utils';

import { LogPanel } from './LogPanel';
import { translations } from '../../translations';

const DefaultStory = () => (
  <div className='flex flex-col bs-dvh is-full'>
    <Toolbar.Root>
      <Button onClick={() => log.info('info message', { at: Date.now() })}>Info</Button>
      <Button onClick={() => log.warn('warn message', { at: Date.now() })}>Warn</Button>
      <Button onClick={() => log.error('error message', { at: Date.now() })}>Error</Button>
    </Toolbar.Root>
    <div className='flex-1 min-bs-0'>
      <LogPanel initialFilter='info' />
    </div>
  </div>
);

const meta: Meta<typeof LogPanel> = {
  title: 'ui/react-ui-debug/LogPanel',
  component: LogPanel,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ fullscreen: true }), withStorybookGlobals({ translations })],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof LogPanel>;

export const Default: Story = {};
```

Note: confirm the exact `withTheme`/`withLayout`/translations-decorator idiom against a sibling story (e.g. `packages/ui/react-ui-card/src/components/**/*.stories.tsx`) and match it; the decorator import paths and `withLayout` options vary by package. Use whatever that sibling uses to register `translations`.

- [ ] **Step 8: Build and test**

Run: `moon run react-ui-debug:build`
Expected: PASS.
Run: `moon run react-ui-debug:test`
Expected: PASS (format tests).

- [ ] **Step 9: Visual check in storybook**

Reuse the running storybook (do not kill the user's server on :9009; check with `curl -s localhost:9009 >/dev/null && echo up`). If not running, start on another port: `moon run storybook-react:serve -- --port 9010`. Open the `ui/react-ui-debug/LogPanel` story, click Info/Warn/Error, confirm rows appear colored, filter/level/record/clear/copy work, rows expand.

- [ ] **Step 10: Format and commit**

```bash
pnpm format
git add packages/ui/react-ui-debug
git commit -m "react-ui-debug: implement LogPanel"
```

---

### Task 3: Rewire devtools performance `LoggingPanel` to `<LogPanel>`

**Files:**
- Modify: `packages/devtools/devtools/package.json` (add dep)
- Modify: `packages/devtools/devtools/tsconfig.json` (add reference)
- Modify: `packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx`

**Interfaces:**
- Consumes: `LogPanel` from `@dxos/react-ui-debug`; `Panel`, `type CustomPanelProps` from `../Panel`.

- [ ] **Step 1: Add the workspace dependency**

Run: `pnpm add --filter "@dxos/devtools" "@dxos/react-ui-debug@workspace:*"`
Then add to `packages/devtools/devtools/tsconfig.json` `references` array:
```json
{ "path": "../../ui/react-ui-debug" }
```
(Insert in existing alphabetical-ish position among the `../../ui/*` references.)

- [ ] **Step 2: Replace `LoggingPanel.tsx` with the thin wrapper**

```tsx
//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { LogPanel } from '@dxos/react-ui-debug';

import { type CustomPanelProps, Panel } from '../Panel';

export const LoggingPanel = ({ maxLines = 100, ...props }: CustomPanelProps<{ maxLines?: number }>) => (
  <Panel {...props} icon='ph--list--regular' title='Logging'>
    <LogPanel maxLines={maxLines} initialFilter='intent-dispatcher:debug' classNames='bs-[280px]' />
  </Panel>
);
```

- [ ] **Step 3: Build**

Run: `moon run devtools:build`
Expected: PASS. Confirm no remaining references to the deleted inline implementation:
Run: `grep -n "shouldLog\|addProcessor" packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx`
Expected: no matches.

- [ ] **Step 4: Format and commit**

```bash
pnpm format
git add packages/devtools/devtools/package.json packages/devtools/devtools/tsconfig.json packages/devtools/devtools/src/components/performance/panels/LoggingPanel.tsx pnpm-lock.yaml
git commit -m "devtools: reuse react-ui-debug LogPanel in performance LoggingPanel"
```

---

### Task 4: Reimplement devtools performance `Panel.tsx` on the react-ui `Panel` primitive

**Files:**
- Modify: `packages/devtools/devtools/src/components/performance/Panel.tsx`

**Interfaces:**
- Consumes: `Panel as PanelPrimitive`, `Icon`, `type ThemedClassName` from `@dxos/react-ui`; `mx` from `@dxos/ui-theme`.
- Produces: unchanged `Panel`, `type PanelProps`, `type CustomPanelProps<T>` (API preserved — all ~10 consumers unaffected).

- [ ] **Step 1: Rewrite `Panel.tsx` preserving the public API**

```tsx
//
// Copyright 2024 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Icon, Panel as PanelPrimitive, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type PanelProps = ThemedClassName<{
  id: string;
  icon: string;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
  maxHeight?: number;
  open?: boolean;
  onToggle?: (id: string, open: boolean) => void;
}>;

export type CustomPanelProps<T> = Pick<PanelProps, 'id' | 'open' | 'onToggle'> & T;

export const Panel = ({
  classNames,
  children,
  id,
  icon,
  title,
  info,
  padding = true,
  maxHeight = 240,
  open = true,
  onToggle,
}: PropsWithChildren<PanelProps>) => {
  return (
    // Collapsible section: auto-height rows so the content can animate closed (the primitive defaults to 1fr content).
    <PanelPrimitive.Root style={{ gridTemplateRows: 'auto auto' }} classNames='shrink-0'>
      <PanelPrimitive.Toolbar
        classNames='px-2 text-sm text-fine cursor-pointer justify-between'
        onClick={() => onToggle?.(id, !open)}
      >
        <div className='flex items-center gap-2 py-1'>
          <Icon icon={icon} />
          <span className='truncate'>{title}</span>
        </div>
        {info}
      </PanelPrimitive.Toolbar>
      {children && (
        <PanelPrimitive.Content
          style={{ maxHeight: open ? (maxHeight ? `${maxHeight}px` : undefined) : 0 }}
          classNames={mx(
            'flex flex-col w-full transition-all duration-200 ease-in-out',
            maxHeight ? 'overflow-y-auto' : 'h-full overflow-hidden',
            padding && 'px-2',
            classNames,
          )}
        >
          {children}
        </PanelPrimitive.Content>
      )}
    </PanelPrimitive.Root>
  );
};
```

Note: `Panel.Toolbar` forwards DOM props (it renders a `Primitive.div`), so `onClick` lands on the header element. Verify `onClick` is accepted; if the primitive drops it, wrap the header in a `<div role='button' onClick=…>` inside `Panel.Toolbar asChild` instead.

- [ ] **Step 2: Build**

Run: `moon run devtools:build`
Expected: PASS.

- [ ] **Step 3: Visual check**

In storybook or the running app's devtools performance dashboard (StatsPanel), confirm every collapsible panel (Stats, Logging, Memory, Network, Edge, Performance, …) still renders, the header toggles open/closed, and `info` (the live play/pause toggle on the Stats header) still works. The header now uses the toolbar surface — confirm it reads acceptably; if too heavy, drop `bg-toolbar-surface` via `classNames='!bg-transparent …'`.

- [ ] **Step 4: Format and commit**

```bash
pnpm format
git add packages/devtools/devtools/src/components/performance/Panel.tsx
git commit -m "devtools: reimplement performance Panel on react-ui Panel primitive"
```

---

### Task 5: Wire `plugin-debug` R0 companion + status popover

**Files:**
- Modify: `packages/plugins/plugin-debug/package.json` (add dep)
- Modify: `packages/plugins/plugin-debug/tsconfig.json` (add reference)
- Modify: `packages/plugins/plugin-debug/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-debug/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx`
- Create: `packages/plugins/plugin-debug/src/containers/LogStatus/index.ts`
- Modify: `packages/plugins/plugin-debug/src/containers/index.ts`
- Modify: `packages/plugins/plugin-debug/src/translations.ts`

**Interfaces:**
- Consumes: `LogPanel` from `@dxos/react-ui-debug`; `AppNode`, `AppSurface`, `Surface` helpers already imported in the plugin; `Popover`, `useTranslation` from `@dxos/react-ui`; `StatusBar` from `@dxos/plugin-status-bar/components`.

- [ ] **Step 1: Add the workspace dependency + tsconfig reference**

Run: `pnpm add --filter "@dxos/plugin-debug" "@dxos/react-ui-debug@workspace:*"`
Add to `packages/plugins/plugin-debug/tsconfig.json` `references`:
```json
{ "path": "../../ui/react-ui-debug" }
```

- [ ] **Step 2: Add translations**

In `packages/plugins/plugin-debug/src/translations.ts`, add to the `meta.profile.key` block:
```ts
        'logs.label': 'Logs',
        'open-logs.label': 'Show logs',
```

- [ ] **Step 3: Add the `logs` deck companion in `app-graph-builder.ts`**

Add another `GraphBuilder.createExtension` to the `Effect.all([...])` array (sibling of `spaceObjects`):
```ts
      // Log panel deck companion.
      GraphBuilder.createExtension({
        id: 'logs',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'logs',
              label: ['logs.label', { ns: meta.profile.key }],
              icon: 'ph--list-magnifying-glass--regular',
              data: 'logs' as const,
              position: Position.last,
            }),
          ]),
      }),
```

- [ ] **Step 4: Create `LogStatus` container**

`packages/plugins/plugin-debug/src/containers/LogStatus/LogStatus.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { LogPanel } from '@dxos/react-ui-debug';

import { meta } from '#meta';

/** Status-bar button that opens the log panel in a popover for a quick glance. */
export const LogStatus = () => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Button aria-label={t('open-logs.label')}>
          <Icon icon='ph--list-magnifying-glass--regular' size={4} />
        </StatusBar.Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport classNames='is-[40rem] bs-[24rem]'>
            <LogPanel />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
```

`packages/plugins/plugin-debug/src/containers/LogStatus/index.ts`:
```ts
//
// Copyright 2026 DXOS.org
//

export * from './LogStatus';
```

Add to `packages/plugins/plugin-debug/src/containers/index.ts`:
```ts
export * from './LogStatus';
```

Note: verify `StatusBar.Button` accepts children + `aria-label` (see `plugin-status-bar/src/components/StatusBar/StatusBar.tsx`); mirror the `DebugStatus` usage of `StatusBar` if the API differs. Confirm the `Popover.Content`/`Popover.Viewport` sizing classes against `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx`.

- [ ] **Step 5: Add the two surfaces in `react-surface.tsx`**

Add `LogStatus` to the `#containers` import list and `LogPanel` import:
```ts
import { LogPanel } from '@dxos/react-ui-debug';
```
Add these `Surface.create` entries to the contributed array:
```tsx
      Surface.create({
        id: 'logs',
        filter: Surface.makeFilter(AppSurface.deckCompanion('logs')),
        component: () => <LogPanel />,
      }),
      Surface.create({
        id: 'logStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <LogStatus />,
      }),
```

- [ ] **Step 6: Build and test**

Run: `moon run plugin-debug:build`
Expected: PASS.
Run: `moon run plugin-debug:test`
Expected: PASS (existing `DebugPlugin.test.ts`).

- [ ] **Step 7: App verification**

Launch Composer (see `run` skill / `REPOSITORY_GUIDE.md`), enable the Debug plugin, confirm: (a) a `Logs` tab/button appears in the R0 complementary sidebar and shows `<LogPanel>`; (b) a log button appears in the status bar and opens the panel in a popover. Emit activity, confirm entries stream and the toolbar controls work.

- [ ] **Step 8: Format and commit**

```bash
pnpm format
git add packages/plugins/plugin-debug pnpm-lock.yaml
git commit -m "plugin-debug: add R0 log companion and status-bar popover"
```

---

## Deferred / tracked

- **Tracked (out of scope, unrelated bug):** DevTools Storage tab error —
  `{ readonly feedKeys: ReadonlyArray<PublicKey> } └─ ["feedKeys"] └─ is missing`.
  A schema-validation mismatch in the devtools Storage panel; file separately.

## Self-Review

- **Spec coverage:** LogPanel (Tasks 1–2), filter/level/record/reset/copy toolbar (Task 2), rolling most-recent buffer (Task 2), compact-expand rows (Task 2), devtools reuse (Task 3), Panel refactor (Task 4), R0 companion + status popover (Task 5), translations (Tasks 1 & 5). All spec sections mapped.
- **Placeholder scan:** none — every code step contains full content. Two "Note:" callouts direct the implementer to verify a sibling idiom (storybook decorators, StatusBar/Popover API); these are verification instructions, not missing code.
- **Type consistency:** `formatLogEntry`/`LogRecord`, `LogPanelProps`, `PanelProps`/`CustomPanelProps` names match across tasks; `LogPanel` import path `@dxos/react-ui-debug` consistent in Tasks 3 & 5.
