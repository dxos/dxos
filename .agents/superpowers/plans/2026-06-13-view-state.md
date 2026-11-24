# ViewState Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory-only `SelectionManager` with a generic, pluggable-backend `ViewState` mechanism (memory + localStorage now, ECHO/personal-space later), make selection one aspect of it, and migrate the markdown editor's bespoke `EditorStateStore` onto it.

**Architecture:** A `Manager` holds a set of declared _aspects_ (`define({ key, backend, schema, defaultValue })`) and routes each `(aspect, contextId)` pair to a reactive `Atom.Writable<T>` produced by a named backend. The `memory` backend keeps atoms in a `Map`; the `local` backend seeds atoms from `localStorage`, persists on `set`, and reacts to cross-tab `storage` events. The contract permits asynchronous hydration so a future `personal` (ECHO) backend slots in without interface changes. Selection becomes a memory-backed aspect plus pure helpers; thin `useSelection` / `useSelectionActions` hooks preserve today's ergonomics. The editor exemplar swaps `createEditorStateStore` for a `local`-backed aspect adapter.

**Tech Stack:** TypeScript, Effect Schema, `@effect-atom/atom-react` (Atom/Registry), React, vitest, moon.

---

## Conventions for every task

- Work only in the assigned worktree: `/Users/burdon/Code/dxos/dxos/.claude/worktrees/wizardly-lehmann-7712e4`.
- Package commands use moon. Build: `moon run react-ui-attention:build`. Test a single file: `moon run react-ui-attention:test -- src/view-state/view-state.test.ts`. Lint: `moon run react-ui-attention:lint -- --fix`.
- Tests: vitest, `describe`/`test`, `test('…', ({ expect }) => …)`. Place tests next to the module as `module.test.ts`.
- Single quotes, arrow functions, no default exports for new code, JSDoc with trailing periods, comments state the _why_.
- No `as`-casts to silence the checker (`as const` is fine). Fix types at the source.
- After moving code, update every call site — no compatibility re-exports/shims.
- Commit after each task with a conventional-commit message; co-author line:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

# Phase 1 — ViewState core (memory + local backends)

## File structure (Phase 1)

- Create `packages/ui/react-ui-attention/src/view-state/view-state.ts` — `AspectDef`, `BackendName`, `define`, `Backend`, `Manager`.
- Create `packages/ui/react-ui-attention/src/view-state/backends.ts` — `MemoryBackend`, `LocalBackend`, `createDefaultBackends`.
- Create `packages/ui/react-ui-attention/src/view-state/index.ts` — barrel.
- Create tests `view-state.test.ts`, `backends.test.ts` alongside.

---

### Task 1: Aspect definition + types

**Files:**

- Create: `packages/ui/react-ui-attention/src/view-state/view-state.ts`
- Test: `packages/ui/react-ui-attention/src/view-state/view-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Manager, define } from './view-state';
import { createDefaultBackends } from './backends';

const Counter = define({
  key: 'counter',
  backend: 'memory',
  schema: Schema.Struct({ value: Schema.Number }).pipe(Schema.mutable),
  defaultValue: () => ({ value: 0 }),
});

describe('Manager', () => {
  const make = () => {
    const registry = Registry.make();
    return new Manager({ registry, backends: createDefaultBackends(registry) });
  };

  test('returns the aspect default for an unwritten context', ({ expect }) => {
    const manager = make();
    expect(manager.get(Counter, 'a')).toEqual({ value: 0 });
  });

  test('set then get round-trips per context', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 5 });
    expect(manager.get(Counter, 'a')).toEqual({ value: 5 });
    expect(manager.get(Counter, 'b')).toEqual({ value: 0 });
  });

  test('subscribe fires on change for that context', ({ expect }) => {
    const manager = make();
    let calls = 0;
    const dispose = manager.subscribe(Counter, 'a', () => {
      calls++;
    });
    manager.set(Counter, 'a', { value: 1 });
    expect(calls).toBeGreaterThan(0);
    dispose();
  });

  test('contexts enumerates touched contexts for an aspect', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 1 });
    manager.set(Counter, 'b', { value: 2 });
    expect(new Set(manager.contexts(Counter))).toEqual(new Set(['a', 'b']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run react-ui-attention:test -- src/view-state/view-state.test.ts`
Expected: FAIL — cannot resolve `./view-state` / `./backends`.

- [ ] **Step 3: Write `view-state.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Atom, type Registry } from '@effect-atom/atom-react';
import type * as Schema from 'effect/Schema';

/**
 * Persistence backend identifier. `personal` (ECHO/personal-space) is reserved for a future backend.
 */
export type BackendName = 'memory' | 'local';

/**
 * Declares a kind of per-context UI state. The value type `T` is inferred from the schema.
 */
export interface AspectDef<T> {
  readonly key: string;
  readonly backend: BackendName;
  readonly schema: Schema.Schema<T, any>;
  readonly defaultValue: () => T;
}

/**
 * Identity helper that pins the value type from the schema while keeping the literal `key`/`backend`.
 */
export const define = <T>(def: AspectDef<T>): AspectDef<T> => def;

/**
 * A backend produces a reactive, writable atom for each `(aspect, contextId)` pair. Backends may
 * hydrate asynchronously (an ECHO backend would), yielding `aspect.defaultValue()` until loaded;
 * the memory and local backends resolve synchronously.
 */
export interface Backend {
  /** Stable atom for the pair; created (and seeded) on first access, cached thereafter. */
  atom: <T>(aspect: AspectDef<T>, contextId: string) => Atom.Writable<T>;
  /** Persist a value after the atom is updated. No-op for in-memory backends. */
  persist?: <T>(aspect: AspectDef<T>, contextId: string, value: T) => void;
  /** Context ids that currently hold a value for the aspect. */
  contexts: (aspect: AspectDef<unknown>) => string[];
  /** Release listeners/timers (used by tests; app-lifetime managers do not call this). */
  dispose?: () => void;
}

export interface ManagerOptions {
  readonly registry: Registry.Registry;
  readonly backends: Record<BackendName, Backend>;
}

/**
 * Routes per-context UI state to the backend declared by each aspect. Reads/writes go through the
 * effect-atom registry so React hooks and graph atoms observe changes uniformly.
 */
export class Manager {
  readonly #registry: Registry.Registry;
  readonly #backends: Record<BackendName, Backend>;

  constructor({ registry, backends }: ManagerOptions) {
    this.#registry = registry;
    this.#backends = backends;
  }

  /** Reactive atom for `(aspect, contextId)`; pass to `registry.get` inside derived atoms/hooks. */
  atom<T>(aspect: AspectDef<T>, contextId: string): Atom.Writable<T> {
    return this.#backends[aspect.backend].atom(aspect, contextId);
  }

  get<T>(aspect: AspectDef<T>, contextId: string): T {
    return this.#registry.get(this.atom(aspect, contextId));
  }

  set<T>(aspect: AspectDef<T>, contextId: string, value: T): void {
    const backend = this.#backends[aspect.backend];
    this.#registry.set(backend.atom(aspect, contextId), value);
    backend.persist?.(aspect, contextId, value);
  }

  update<T>(aspect: AspectDef<T>, contextId: string, fn: (prev: T) => T): void {
    this.set(aspect, contextId, fn(this.get(aspect, contextId)));
  }

  subscribe<T>(aspect: AspectDef<T>, contextId: string, cb: (value: T) => void): () => void {
    const atom = this.atom(aspect, contextId);
    return this.#registry.subscribe(atom, () => cb(this.#registry.get(atom)));
  }

  contexts<T>(aspect: AspectDef<T>): string[] {
    return this.#backends[aspect.backend].contexts(aspect);
  }
}
```

- [ ] **Step 4: Write minimal `backends.ts` to satisfy the test (memory only for now; local stub fine)**

Create `packages/ui/react-ui-attention/src/view-state/backends.ts` with the `MemoryBackend` and a `createDefaultBackends` that wires memory for both names temporarily; Task 2 replaces the `local` entry.

```ts
//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { type AspectDef, type BackendName, type Backend } from './view-state';

const cacheKey = (aspect: AspectDef<unknown>, contextId: string) => `${aspect.key}:${contextId}`;

/** In-memory backend: reproduces the legacy `SelectionManager` behaviour. */
export class MemoryBackend implements Backend {
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();

  atom<T>(aspect: AspectDef<T>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(aspect, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      atom = Atom.make<unknown>(aspect.defaultValue());
      this.#atoms.set(key, atom);
    }
    return atom as Atom.Writable<T>;
  }

  contexts(aspect: AspectDef<unknown>): string[] {
    const prefix = `${aspect.key}:`;
    return [...this.#atoms.keys()].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }
}

export const createDefaultBackends = (registry: Registry.Registry): Record<BackendName, Backend> => {
  const memory = new MemoryBackend();
  return { memory, local: memory };
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run react-ui-attention:test -- src/view-state/view-state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui-attention/src/view-state/
git commit -m "feat(react-ui-attention): add Manager + aspect definitions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Local (localStorage) backend

**Files:**

- Modify: `packages/ui/react-ui-attention/src/view-state/backends.ts`
- Test: `packages/ui/react-ui-attention/src/view-state/backends.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { LocalBackend } from './backends';
import { Manager, define } from './view-state';

const Editor = define({
  key: 'editor',
  backend: 'local',
  schema: Schema.Struct({ scrollTo: Schema.optional(Schema.Number) }).pipe(Schema.mutable),
  defaultValue: () => ({}),
});

// Minimal in-memory Storage stand-in (no real localStorage in the test runner).
const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
};

describe('LocalBackend', () => {
  const make = () => {
    const registry = Registry.make();
    const storage = fakeStorage();
    const local = new LocalBackend({ registry, storage });
    const manager = new Manager({ registry, backends: { memory: local, local } });
    return { manager, storage };
  };

  test('default until written', ({ expect }) => {
    const { manager } = make();
    expect(manager.get(Editor, 'doc-1')).toEqual({});
  });

  test('set persists encoded JSON under the namespaced key', ({ expect }) => {
    const { manager, storage } = make();
    manager.set(Editor, 'doc-1', { scrollTo: 42 });
    expect(JSON.parse(storage.getItem('dxos:view-state:editor:doc-1')!)).toEqual({ scrollTo: 42 });
  });

  test('reading does not write defaults to storage', ({ expect }) => {
    const { manager, storage } = make();
    manager.get(Editor, 'doc-1');
    expect(storage.getItem('dxos:view-state:editor:doc-1')).toBeNull();
  });

  test('seeds atom from pre-existing storage value', ({ expect }) => {
    const { manager, storage } = make();
    storage.setItem('dxos:view-state:editor:doc-2', JSON.stringify({ scrollTo: 7 }));
    expect(manager.get(Editor, 'doc-2')).toEqual({ scrollTo: 7 });
  });

  test('falls back to default on unparseable storage value', ({ expect }) => {
    const { manager, storage } = make();
    storage.setItem('dxos:view-state:editor:doc-3', '{not json');
    expect(manager.get(Editor, 'doc-3')).toEqual({});
  });

  test('contexts enumerates persisted contexts', ({ expect }) => {
    const { manager } = make();
    manager.set(Editor, 'doc-1', { scrollTo: 1 });
    manager.set(Editor, 'doc-2', { scrollTo: 2 });
    expect(new Set(manager.contexts(Editor))).toEqual(new Set(['doc-1', 'doc-2']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run react-ui-attention:test -- src/view-state/backends.test.ts`
Expected: FAIL — `LocalBackend` is not exported.

- [ ] **Step 3: Implement `LocalBackend` and wire it into `createDefaultBackends`**

Add to `backends.ts` (keep `MemoryBackend`; replace the `local: memory` wiring):

```ts
import * as Schema from 'effect/Schema';

const STORAGE_PREFIX = 'dxos:view-state:';
const storageKeyFor = (aspect: AspectDef<unknown>, contextId: string) => `${STORAGE_PREFIX}${aspect.key}:${contextId}`;

export interface LocalBackendOptions {
  readonly registry: Registry.Registry;
  /** Injectable for tests; defaults to `window.localStorage`. */
  readonly storage?: Storage;
}

/** localStorage-backed backend: seeds atoms from storage, persists on set, syncs across tabs. */
export class LocalBackend implements Backend {
  readonly #registry: Registry.Registry;
  readonly #storage: Storage;
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();
  // Reverse map: storage key -> (aspect, contextId) so `storage` events can target the right atom.
  readonly #byStorageKey = new Map<string, { aspect: AspectDef<unknown>; contextId: string }>();
  #storageListener?: (event: StorageEvent) => void;

  constructor({ registry, storage = globalThis.localStorage }: LocalBackendOptions) {
    this.#registry = registry;
    this.#storage = storage;
    if (typeof globalThis.addEventListener === 'function') {
      this.#storageListener = (event) => {
        if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) {
          return;
        }
        const entry = this.#byStorageKey.get(event.key);
        const atom = entry && this.#atoms.get(cacheKey(entry.aspect, entry.contextId));
        if (entry && atom) {
          this.#registry.set(atom, this.#read(entry.aspect, event.key));
        }
      };
      globalThis.addEventListener('storage', this.#storageListener);
    }
  }

  atom<T>(aspect: AspectDef<T>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(aspect, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      const storageKey = storageKeyFor(aspect, contextId);
      atom = Atom.make<unknown>(this.#read(aspect, storageKey));
      this.#atoms.set(key, atom);
      this.#byStorageKey.set(storageKey, { aspect, contextId });
    }
    return atom as Atom.Writable<T>;
  }

  persist<T>(aspect: AspectDef<T>, contextId: string, value: T): void {
    this.#storage.setItem(storageKeyFor(aspect, contextId), JSON.stringify(Schema.encodeSync(aspect.schema)(value)));
  }

  contexts(aspect: AspectDef<unknown>): string[] {
    const prefix = storageKeyFor(aspect, '');
    const ids: string[] = [];
    for (let index = 0; index < this.#storage.length; index++) {
      const key = this.#storage.key(index);
      if (key?.startsWith(prefix)) {
        ids.push(key.slice(prefix.length));
      }
    }
    return ids;
  }

  dispose(): void {
    if (this.#storageListener && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('storage', this.#storageListener);
    }
  }

  #read<T>(aspect: AspectDef<T>, storageKey: string): T {
    const raw = this.#storage.getItem(storageKey);
    if (raw == null) {
      return aspect.defaultValue();
    }
    try {
      return Schema.decodeUnknownSync(aspect.schema)(JSON.parse(raw));
    } catch {
      // Tolerate stale/corrupt entries (e.g. a prior schema shape) by falling back to the default.
      return aspect.defaultValue();
    }
  }
}
```

Update `createDefaultBackends`:

```ts
export const createDefaultBackends = (registry: Registry.Registry): Record<BackendName, Backend> => ({
  memory: new MemoryBackend(),
  local: new LocalBackend({ registry }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run react-ui-attention:test -- src/view-state/backends.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the barrel and verify build**

Create `packages/ui/react-ui-attention/src/view-state/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './view-state';
export * from './backends';
```

Run: `moon run react-ui-attention:build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui-attention/src/view-state/
git commit -m "feat(react-ui-attention): add localStorage-backed ViewState backend

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 2 — Selection as an aspect + hooks + call-site migration

## File structure (Phase 2)

- Modify `packages/ui/react-ui-attention/src/view-state/Selection.ts` — keep `SelectionMode`/`Selection`/`Result`/`defaultValue`; add `aspect` + pure helpers (`resolveSelection`, `toggleSelection`); reimplement `getValue` against `Manager`; **remove the `SelectionManager` class**.
- Rename dir `components/SelectionProvider/` → `components/ViewStateProvider/`; file `ViewStateProvider.tsx` exporting `ViewStateProvider`, `useManager`, `useViewState`, `useViewStateActions`, `useSelection`, `useSelectionActions`.
- Update `components/index.ts`, `src/index.ts`, `src/types/index.ts`.
- Migrate all consumers (Tasks 5–8).

---

### Task 3: Selection aspect + pure helpers

**Files:**

- Modify: `packages/ui/react-ui-attention/src/selection.ts`
- Test: `packages/ui/react-ui-attention/src/selection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { resolveSelection, aspect, toggleSelection } from './selection';

describe('selection helpers', () => {
  test('aspect declares a memory-backed aspect', ({ expect }) => {
    expect(aspect.key).toEqual('selection');
    expect(aspect.backend).toEqual('memory');
    expect(aspect.defaultValue()).toEqual({ mode: 'multi', ids: [] });
  });

  test('resolveSelection extracts the value for the requested mode', ({ expect }) => {
    expect(resolveSelection({ mode: 'single', id: 'x' }, 'single')).toEqual('x');
    expect(resolveSelection({ mode: 'multi', ids: ['a', 'b'] }, 'multi')).toEqual(['a', 'b']);
    expect(resolveSelection({ mode: 'range', from: 'a', to: 'b' }, 'range')).toEqual({ from: 'a', to: 'b' });
  });

  test('resolveSelection returns the requested-mode default on mismatch or undefined', ({ expect }) => {
    expect(resolveSelection(undefined, 'single')).toBeUndefined();
    expect(resolveSelection(undefined, 'multi')).toEqual([]);
    // Stored value is the default multi but a single reader asks — yields the single default.
    expect(resolveSelection({ mode: 'multi', ids: [] }, 'single')).toBeUndefined();
    expect(resolveSelection({ mode: 'range' }, 'range')).toBeUndefined();
  });

  test('toggleSelection adds/removes within a multi selection', ({ expect }) => {
    expect(toggleSelection({ mode: 'multi', ids: ['a'] }, 'b')).toEqual({ mode: 'multi', ids: ['a', 'b'] });
    expect(toggleSelection({ mode: 'multi', ids: ['a', 'b'] }, 'b')).toEqual({ mode: 'multi', ids: ['a'] });
    // Tolerate a non-multi current value by starting fresh.
    expect(toggleSelection({ mode: 'single', id: 'x' }, 'b')).toEqual({ mode: 'multi', ids: ['b'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run react-ui-attention:test -- src/selection.test.ts`
Expected: FAIL — `aspect` / `resolveSelection` / `toggleSelection` not exported.

- [ ] **Step 3: Rewrite `selection.ts`**

Keep the existing `SelectionMode`, `Selection`, `defaultValue`, `Result` (top of `view-state/Selection.ts`) unchanged. Replace `getValue` and the entire `SelectionManager` class with:

```ts
import { define } from './view-state';
import type { Manager } from './view-state';

/** Selection state for a context, stored in memory (ephemeral, per-device session). */
export const aspect = define<Selection>({
  key: 'selection',
  backend: 'memory',
  schema: Selection,
  defaultValue: () => ({ mode: 'multi', ids: [] }),
});

/**
 * Extract the typed result for `mode` from a stored selection value, returning the requested
 * mode's default when the stored value is absent or holds a different mode.
 */
export const resolveSelection = <T extends SelectionMode>(selection: Selection | undefined, mode: T): Result<T> => {
  const value = selection?.mode === mode ? selection : defaultValue(mode);
  return Match.type<Selection>().pipe(
    Match.when({ mode: 'single' }, (s) => s.id),
    Match.when({ mode: 'multi' }, (s) => s.ids),
    Match.when({ mode: 'range' }, (s) => (s.from && s.to ? { from: s.from, to: s.to } : undefined)),
    Match.when({ mode: 'multi-range' }, (s) => s.ranges),
    Match.exhaustive,
  )(value) as Result<T>;
};

/** Toggle `id` within a multi selection; resets to a multi selection if the current value differs. */
export const toggleSelection = (selection: Selection | undefined, id: string): Selection => {
  const ids = selection?.mode === 'multi' ? selection.ids : [];
  return { mode: 'multi', ids: ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id] };
};

/** Union of all multi-selected ids across every selection context, plus an optional explicit id. */
export const getValue = (manager: Manager, contextId?: string): Set<string> => {
  const ids = new Set<string>(contextId ? [contextId] : []);
  for (const context of manager.contexts(aspect)) {
    const selection = manager.get(aspect, context);
    if (selection.mode === 'multi') {
      for (const id of selection.ids) {
        ids.add(id);
      }
    }
  }
  return ids;
};
```

Remove the now-unused `Atom`/`Registry`/`invariant` imports if they are no longer referenced (`Match` and `Schema` are still used).

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run react-ui-attention:test -- src/selection.test.ts`
Expected: PASS (4 tests). The package will not fully build yet (SelectionProvider still references the removed class) — fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-attention/src/selection.ts packages/ui/react-ui-attention/src/selection.test.ts
git commit -m "refactor(react-ui-attention): make selection a ViewState aspect with pure helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: ViewStateProvider + generic hooks + selection wrappers

**Files:**

- Create: `packages/ui/react-ui-attention/src/components/ViewStateProvider/ViewStateProvider.tsx`
- Create: `packages/ui/react-ui-attention/src/components/ViewStateProvider/index.ts`
- Delete: `packages/ui/react-ui-attention/src/components/SelectionProvider/` (whole dir)
- Modify: `packages/ui/react-ui-attention/src/components/index.ts`
- Modify: `packages/ui/react-ui-attention/src/index.ts`, `packages/ui/react-ui-attention/src/types/index.ts`
- Test: `packages/ui/react-ui-attention/src/components/ViewStateProvider/ViewStateProvider.test.tsx`

- [ ] **Step 1: Write the failing test (React, jsdom via vitest browser/jsdom already used by package stories)**

```tsx
//
// Copyright 2026 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { act, renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, test } from 'vitest';

import { createDefaultBackends } from '../../view-state';
import { Manager } from '../../view-state';
import { ViewStateProvider, useSelection, useSelectionActions } from './ViewStateProvider';

const wrapper =
  (manager: Manager, registry: Registry.Registry) =>
  ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>
      <ViewStateProvider manager={manager}>{children}</ViewStateProvider>
    </RegistryContext.Provider>
  );

describe('useSelection / useSelectionActions', () => {
  test('single select updates the resolved value', ({ expect }) => {
    const registry = Registry.make();
    const manager = new Manager({ registry, backends: createDefaultBackends(registry) });
    const Wrapper = wrapper(manager, registry);
    const { result: value } = renderHook(() => useSelection('ctx', 'single'), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useSelectionActions('ctx'), { wrapper: Wrapper });
    expect(value.current).toBeUndefined();
    act(() => actions.current.single('item-1'));
    expect(value.current).toEqual('item-1');
  });

  test('toggle within multi selection', ({ expect }) => {
    const registry = Registry.make();
    const manager = new Manager({ registry, backends: createDefaultBackends(registry) });
    const Wrapper = wrapper(manager, registry);
    const { result: value } = renderHook(() => useSelection('ctx', 'multi'), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useSelectionActions('ctx'), { wrapper: Wrapper });
    act(() => actions.current.toggle('a'));
    act(() => actions.current.toggle('b'));
    expect(value.current).toEqual(['a', 'b']);
    act(() => actions.current.toggle('a'));
    expect(value.current).toEqual(['b']);
  });
});
```

> If `@testing-library/react` is not already a dev dependency of this package, add it: `pnpm add --filter @dxos/react-ui-attention --save-catalog @testing-library/react`. Check the catalog first — it is widely used in the repo, so prefer the existing catalog version.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run react-ui-attention:test -- src/components/ViewStateProvider/ViewStateProvider.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `ViewStateProvider.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { useDefaultValue } from '@dxos/react-hooks';

import { type SelectionMode, type Result, resolveSelection, aspect, toggleSelection } from '../../selection';
import { type AspectDef, Manager, createDefaultBackends } from '../../view-state';

const VIEW_STATE_NAME = 'ViewState';

type ViewStateContextValue = { manager: Manager };

// Default value lets consumers render outside a provider (isolated stories/tests) without throwing;
// `manager` reads as `undefined` and hooks fall back to aspect defaults / no-op actions.
const [ViewStateContextProvider, useViewStateContext] = createContext<ViewStateContextValue>(VIEW_STATE_NAME, {
  manager: undefined as unknown as Manager,
});

/** Provides the per-context UI state manager. Replaces the former `SelectionProvider`. */
export const ViewStateProvider = ({ children, manager: managerProp }: PropsWithChildren<{ manager?: Manager }>) => {
  const registry = useContext(RegistryContext);
  const manager = useDefaultValue(
    managerProp,
    () => new Manager({ registry, backends: createDefaultBackends(registry) }),
  );
  return <ViewStateContextProvider manager={manager}>{children}</ViewStateContextProvider>;
};

export const useManager = (): Manager => useViewStateContext(VIEW_STATE_NAME).manager;

/** Reactive read of an aspect value for a context; yields the aspect default when unset or unprovided. */
export const useViewState = <T,>(aspect: AspectDef<T>, contextId?: string): T => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  const [value, setValue] = useState<T>(() =>
    contextId && manager ? manager.get(aspect, contextId) : aspect.defaultValue(),
  );
  useEffect(() => {
    if (!contextId || !manager) {
      setValue(aspect.defaultValue());
      return;
    }
    setValue(manager.get(aspect, contextId));
    return manager.subscribe(aspect, contextId, setValue);
  }, [manager, aspect, contextId]);
  return value;
};

export type UseViewStateActions<T> = {
  set: (value: T) => void;
  update: (fn: (prev: T) => T) => void;
  clear: () => void;
};

export const useViewStateActions = <T,>(aspect: AspectDef<T>, contextId?: string): UseViewStateActions<T> => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  return useMemo<UseViewStateActions<T>>(
    () => ({
      set: (value) => contextId && manager?.set(aspect, contextId, value),
      update: (fn) => contextId && manager?.update(aspect, contextId, fn),
      clear: () => contextId && manager?.set(aspect, contextId, aspect.defaultValue()),
    }),
    [manager, aspect, contextId],
  );
};

/** Resolved selection value for `contextId` in the requested `mode` (default `multi`). */
export const useSelection = <T extends SelectionMode>(contextId?: string, mode: T = 'multi' as T): Result<T> =>
  resolveSelection(useViewState(aspect, contextId), mode);

export type UseSelectionActions = {
  single: (id: string) => void;
  multi: (ids: string[]) => void;
  range: (from: string, to: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
};

/** Selection mutators for a single context, built on the generic ViewState actions. */
export const useSelectionActions = (contextId?: string): UseSelectionActions => {
  const { update, clear } = useViewStateActions(aspect, contextId);
  return useMemo<UseSelectionActions>(
    () => ({
      single: (id) => update(() => ({ mode: 'single', id })),
      multi: (ids) => update(() => ({ mode: 'multi', ids: [...ids] })),
      range: (from, to) => update(() => ({ mode: 'range', from, to })),
      toggle: (id) => update((prev) => toggleSelection(prev, id)),
      clear,
    }),
    [update, clear],
  );
};
```

- [ ] **Step 4: Add barrel + update exports + delete old dir**

`components/ViewStateProvider/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './ViewStateProvider';
```

Edit `packages/ui/react-ui-attention/src/components/index.ts`: replace `export * from './SelectionProvider';` with `export * from './ViewStateProvider';`.

Edit `packages/ui/react-ui-attention/src/index.ts`: add `export * from './view-state';` (selection/components already exported). Edit `src/types/index.ts`: add `export * from './view-state';` after the selection export (UI-free core belongs in the types entrypoint).

Delete the directory:

```bash
git rm -r packages/ui/react-ui-attention/src/components/SelectionProvider
```

- [ ] **Step 5: Update the testing decorator**

Edit `packages/ui/react-ui-attention/src/testing/decorators/withAttention.ts`: replace `SelectionProvider` import/usage with `ViewStateProvider` (the `selection={...}` prop becomes `manager={...}` if a manager is passed; if it currently passes `{}`, just render `createElement(ViewStateProvider, {}, createElement(Story))`).

- [ ] **Step 6: Run test + build**

Run: `moon run react-ui-attention:test -- src/components/ViewStateProvider/ViewStateProvider.test.tsx`
Expected: PASS (2 tests).
Run: `moon run react-ui-attention:build`
Expected: success (package self-contained again).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-attention/src
git commit -m "feat(react-ui-attention): ViewStateProvider with generic + selection hooks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Migrate plugin-attention (provides the manager)

**Files:**

- Modify: `packages/plugins/plugin-attention/src/AttentionPlugin.ts`
- Modify: `packages/plugins/plugin-attention/src/types/capabilities.ts`
- Modify: `packages/plugins/plugin-attention/src/capabilities/react-context.tsx`

- [ ] **Step 1: Update the capability type.** In `types/capabilities.ts`: import `Manager` (from `@dxos/react-ui-attention`) instead of `SelectionManager`; rename the capability to carry it. Keep the capability id stable to avoid churn elsewhere, but rename the binding:

```ts
import { type AttentionManager, type Manager } from '@dxos/react-ui-attention';
// ...
export const ViewState = Capability.make<Manager>(`${meta.id}.capability.view-state`);
```

Remove the old `Selection` capability export.

- [ ] **Step 2: Construct the manager.** In `AttentionPlugin.ts`:

```ts
import { AttentionManager, Manager, createDefaultBackends } from '@dxos/react-ui-attention';
// ...
const attention = new AttentionManager(registry);
const viewState = new Manager({ registry, backends: createDefaultBackends(registry) });
setupDevtools(attention);
return [
  Capability.contributes(AttentionCapabilities.Attention, attention),
  Capability.contributes(AttentionCapabilities.ViewState, viewState),
];
```

- [ ] **Step 3: Update the provider.** In `react-context.tsx`: import `ViewStateProvider`; consume `AttentionCapabilities.ViewState`; render `<ViewStateProvider manager={viewState}>`.

- [ ] **Step 4: Build the two packages.**

Run: `moon run plugin-attention:build`
Expected: success. (Other consumers of the old `Selection` capability — plugin-comments, plugin-trip — break here; fixed in Tasks 7–8. Build them after those tasks.)

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-attention/src
git commit -m "refactor(plugin-attention): provide Manager capability

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Migrate `useSelected` / `useSelectionActions` call sites

These are mechanical hook swaps. Apply each exact change, then build each package.

- [ ] **Step 1: Read-only `useSelected` → `useSelection`** (identical signature). In each file, change the import `useSelected` → `useSelection` and the call `useSelected(` → `useSelection(`:

| File                                                                                        | Line    |
| ------------------------------------------------------------------------------------------- | ------- |
| `packages/plugins/plugin-commerce/src/containers/SearchArticle/SearchArticle.tsx`           | 13, 37  |
| `packages/plugins/plugin-feed/src/containers/MagazineArticle/MagazineArticle.tsx`           | 17, 37  |
| `packages/plugins/plugin-feed/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx` | 16, 31  |
| `packages/plugins/plugin-inbox/src/components/MessageStack/MessageStack.stories.tsx`        | 20, 51  |
| `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx`          | 14, 40  |
| `packages/plugins/plugin-inbox/src/containers/DraftsArticle/DraftsArticle.tsx`              | 13, 37  |
| `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`            | 17, 47  |
| `packages/plugins/plugin-map/src/containers/MapArticle/MapArticle.tsx`                      | 10, 114 |
| `packages/plugins/plugin-space/src/containers/ObjectCardStack/ObjectCardStack.tsx`          | 10, 33  |
| `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx`                   | 16, 41  |
| `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.stories.tsx`           | 21, 156 |
| `packages/plugins/plugin-video/src/containers/VideoSection/VideoSection.tsx`                | 8, 26   |
| `packages/stories/stories-assistant/src/components/MessageModule.tsx`                       | 13, 23  |

For files importing `useArticleKeyboardNavigation` / `linkedSegment` alongside, keep those; only swap `useSelected`.

- [ ] **Step 2: `useTableModel`** (`packages/ui/react-ui-table/src/hooks/useTableModel.ts`). Change the import to `useSelection, useSelectionActions`; update:
  - line 47: `const selected = useSelection(object && Obj.getURI(object), 'multi');`
  - line 88: `useSelectionActions` now takes a single contextId, and the method is `multi` not `multiSelect`:
    ```ts
    const { multi, clear } = useSelectionActions(model?.id);
    ```
    Update the later call (in the `registry.subscribe(model.selection.selectionAtom, …)` effect) from `multiSelect(selectedItems)` to `multi(selectedItems)`.

- [ ] **Step 3: Update stale comments** referencing `useSelected`:
  - `packages/ui/react-ui-form/src/components/Form/FormFieldSet/FormFieldSet.tsx:63`
  - `packages/ui/react-ui-list/src/components/RowList/RowList.tsx:37,42`
  - `packages/plugins/plugin-commerce/src/containers/SearchArticle/SearchArticle.tsx:67`
  - `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:296`
    Replace `useSelected` with `useSelection` in prose and `SelectionManager` with `Manager` where mentioned.

- [ ] **Step 4: Build affected packages.**

Run:

```bash
moon run plugin-commerce:build plugin-feed:build plugin-inbox:build plugin-map:build plugin-space:build plugin-video:build react-ui-table:build
```

Expected: success for all.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: migrate useSelected call sites to useSelection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Migrate plugin-trip + plugin-comments graph builders

**Files:**

- Modify: `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-comments/src/capabilities/app-graph-builder.ts`

- [ ] **Step 1: plugin-trip.** Replace the `SelectionManager` import with `Manager`, `aspect`; consume `AttentionCapabilities.ViewState`. Rewrite `resolvePlanningWindow` and `selectedId`:

```ts
import { linkedSegment, aspect, type Manager } from '@dxos/react-ui-attention';
// ...
const resolvePlanningWindow = (viewState: Manager, nodeId: string): { from: Date; to: Date } => {
  const selection = viewState.get(aspect, getCalendarRangeSelectionId(nodeId));
  const range =
    selection.mode === 'range' && selection.from && selection.to
      ? { from: selection.from, to: selection.to }
      : undefined;
  const now = new Date();
  const from = range ? startOfDay(new Date(range.from)) : startOfDay(now);
  const to = range ? endOfDay(new Date(range.to)) : endOfDay(addDays(now, getPlanningWindowDays()));
  return { from, to };
};
// in the module body:
const viewState = yield * Capability.get(AttentionCapabilities.ViewState);
const selectedId = Atom.family((nodeId: string) =>
  Atom.make((get) => {
    const selection = get(viewState.atom(aspect, nodeId));
    return selection.mode === 'single' ? selection.id : undefined;
  }),
);
```

Update the `resolvePlanningWindow(selectionManager, …)` call site to pass `viewState`.

- [ ] **Step 2: plugin-comments.** Replace imports with `aspect, type Manager` (drop `SelectionMode`/`defaultValue` unless still referenced for `selectionMode` config — keep `SelectionMode` import if the `selectionMode` field type uses it). Change the `selectionManager: SelectionManager` field to `viewState: Manager`. Rewrite the reactive read (current lines 43–46):

```ts
const selection = get(viewState.atom(aspect, objectId));
const anchor = getAnchor(selection);
```

And the imperative read (current line 118):

```ts
const selection = viewState.get(aspect, objectUri);
```

Update the capability lookup (line 100) to `AttentionCapabilities.ViewState` and the params object key (`selectionManager` → `viewState`). The `selectionMode` config and `getAnchor` logic are unchanged; the aspect default (`multi`) already stands in for the previous `defaultValue(selectionMode)` fallback when a context is unwritten.

- [ ] **Step 3: Build.**

Run: `moon run plugin-trip:build plugin-comments:build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-trip/src packages/plugins/plugin-comments/src
git commit -m "refactor(plugin-trip,plugin-comments): read selection via Manager

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Migrate plugin-markdown collaborative selection writer

**Files:**

- Modify: `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`
- Modify: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx`

- [ ] **Step 1: Update the writer.** In `useExtensions.tsx`: replace the `SelectionManager` import/type with `Manager` + `aspect`. Rename the `selectionManager?: SelectionManager` option to `viewState?: Manager`. Rewrite `selectionChange` to write a `multi-range` selection through the manager:

```ts
import { aspect, type Manager } from '@dxos/react-ui-attention';
// ...
const selectionChange = (viewState: Manager) => {
  const debouncedHandler = debounceAndThrottle((update: ViewUpdate) => {
    const id = update.state.facet(documentId);
    const cursorConverter = update.state.facet(Cursor.converter);
    const selection = update.state.selection;
    const ranges = selection.ranges
      .filter((range) => range.to > range.from)
      .map((range) => ({ from: cursorConverter.toCursor(range.from), to: cursorConverter.toCursor(range.to) }));
    viewState.set(aspect, id, { mode: 'multi-range', ranges });
  }, 100);

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.selectionSet) {
      debouncedHandler(update);
    }
  });
};
```

Update the place that calls `selectionChange(selectionManager)` to pass the renamed `viewState` option (search within the file).

- [ ] **Step 2: Update the prop plumbing.** In `MarkdownArticle.tsx`: rename the `selectionManager?: SelectionManager` prop to `viewState?: Manager` (import `Manager`), and update where it is sourced (it is read from the attention capability — change to `AttentionCapabilities.ViewState`) and passed into `useExtensions`. Grep the markdown plugin for the prop name to catch all hand-offs: `grep -rn "selectionManager" packages/plugins/plugin-markdown/src`.

- [ ] **Step 3: Build.**

Run: `moon run plugin-markdown:build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-markdown/src
git commit -m "refactor(plugin-markdown): write collaborative selection via Manager

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 3 — Editor-state exemplar (replace `EditorStateStore`)

## File structure (Phase 3)

- Modify `packages/ui/ui-editor/src/extensions/selection.ts` — add an Effect Schema for `EditorSelectionState`; **delete `createEditorStateStore`**; keep `EditorStateStore` type + `selectionState` extension (the get/set seam stays).
- Modify `packages/plugins/plugin-markdown/src/capabilities/state.ts` — build the editor store from the `Manager` editor aspect instead of `createEditorStateStore`.
- Modify `packages/plugins/plugin-markdown/src/types/MarkdownCapabilities.ts` — unchanged type, but the value is now manager-backed (no code change unless import path changes).
- Modify `packages/ui/react-ui-editor/src/stories/components/util.tsx` — story helper uses an in-memory store (already does via `global` Map); replace any `createEditorStateStore` usage.

---

### Task 9: Editor selection-state schema + delete legacy store

**Files:**

- Modify: `packages/ui/ui-editor/src/extensions/selection.ts`
- Test: `packages/ui/ui-editor/src/extensions/selection.test.ts` (create or extend)

- [ ] **Step 1: Write the failing test for the schema round-trip**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EditorSelectionStateSchema } from './selection';

describe('EditorSelectionStateSchema', () => {
  test('encode/decode preserves the legacy serialized shape', ({ expect }) => {
    const value = { scrollTo: 42, selection: { anchor: 3, head: 9 } };
    const encoded = Schema.encodeSync(EditorSelectionStateSchema)(value);
    expect(encoded).toEqual(value);
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)(JSON.parse(JSON.stringify(encoded)))).toEqual(value);
  });

  test('accepts an empty state', ({ expect }) => {
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)({})).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui-editor:test -- src/extensions/selection.test.ts`
Expected: FAIL — `EditorSelectionStateSchema` not exported.

- [ ] **Step 3: Add the schema; delete `createEditorStateStore`.** In `selection.ts`, add (next to the existing types):

```ts
import * as Schema from 'effect/Schema';

export const EditorSelection = Schema.Struct({
  anchor: Schema.Number,
  head: Schema.optional(Schema.Number),
}).pipe(Schema.mutable);

export const EditorSelectionStateSchema = Schema.Struct({
  scrollTo: Schema.optional(Schema.Number),
  selection: Schema.optional(EditorSelection),
}).pipe(Schema.mutable);
```

Keep `EditorSelection`/`EditorSelectionState` types (or derive them with `Schema.Schema.Type`). Delete the `createEditorStateStore` function (current lines 45–56) and the now-unused `invariant` import if nothing else uses it. Keep `EditorStateStore`, `createEditorStateTransaction`, and `selectionState`.

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run ui-editor:test -- src/extensions/selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Fix the story helper.** Grep `grep -rn "createEditorStateStore" packages/ui/react-ui-editor packages` — replace any remaining usage with an inline in-memory `EditorStateStore` (the stories already keep a `global` Map in `stories/components/util.tsx`; wire `getState`/`setState` to it).

- [ ] **Step 6: Build.**

Run: `moon run ui-editor:build react-ui-editor:build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/ui-editor/src packages/ui/react-ui-editor/src
git commit -m "refactor(ui-editor): add EditorSelectionState schema; drop localStorage store

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Back editor state with the ViewState local aspect

**Files:**

- Modify: `packages/plugins/plugin-markdown/src/capabilities/state.ts`
- Create: `packages/plugins/plugin-markdown/src/capabilities/editor-view-state.ts` (the aspect + adapter)

- [ ] **Step 1: Define the editor aspect + an `EditorStateStore` adapter.** Create `editor-view-state.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Manager, define } from '@dxos/react-ui-attention';
import { type EditorStateStore, EditorSelectionStateSchema } from '@dxos/ui-editor';

/** Per-document editor scroll/caret state, persisted to localStorage on this device. */
export const editorViewStateAspect = define({
  key: 'editor',
  backend: 'local',
  schema: EditorSelectionStateSchema,
  defaultValue: () => ({}),
});

/** Adapts the imperative editor store seam onto the ViewState manager (local backend). */
export const createEditorViewStateStore = (manager: Manager): EditorStateStore => ({
  getState: (id) => manager.get(editorViewStateAspect, id),
  setState: (id, state) => manager.set(editorViewStateAspect, id, state),
});
```

> `EditorStateStore.getState` returns `EditorSelectionState | undefined`; the adapter returns the aspect default `{}` instead of `undefined`. Confirm `selectionState`/`MarkdownEditorContent` treat `{}` the same as `undefined` (they read `scrollTo`/`selection` which are simply absent). If any code branches on the whole object being undefined, adjust it to check the fields. Verify by reading `MarkdownEditorContent.tsx:89` and `ui-editor/.../selection.ts` Ctrl-r handler.

- [ ] **Step 2: Wire it in `state.ts`.** The `state.ts` makeModule must obtain the `Manager`. Resolve the attention capability inside the module:

```ts
import { Capability } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';

import { createEditorViewStateStore } from './editor-view-state';
// ...
const viewState = yield * Capability.get(AttentionCapabilities.ViewState);
const editorState = createEditorViewStateStore(viewState);
```

Remove the `createEditorStateStore` import and the `// TODO(wittjosiah): Fold into state.` line. Keep the `Capability.contributes(MarkdownCapabilities.EditorState, editorState)` line unchanged.

> Check that `plugin-markdown` already depends on `@dxos/plugin-attention` (it consumes the attention capability elsewhere). If not, add it: `pnpm add --filter @dxos/plugin-markdown --save-catalog @dxos/plugin-attention` — but as a workspace dep it must be `workspace:*` in package.json, not from the catalog. Verify the import path for `AttentionCapabilities` matches how other plugins import it (e.g. `#types` is internal to plugin-attention; external consumers import from the package entrypoint — confirm the exported path).

- [ ] **Step 3: Ensure activation ordering.** The markdown `state` module must activate after attention provides `ViewState`. Add `AttentionEvents.AttentionReady` (or the attention capability) to the module's `activatesOn`/dependencies if it is not already guaranteed. Inspect the markdown plugin's module registration and mirror how other markdown modules that need attention declare their activation. If ordering cannot be guaranteed at module load, move the store construction into `react-surface.tsx` where `useCapability(AttentionCapabilities.ViewState)` is available and build the `EditorStateStore` there with `useMemo`.

- [ ] **Step 4: Build.**

Run: `moon run plugin-markdown:build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-markdown/src
git commit -m "feat(plugin-markdown): back editor scroll/caret state with ViewState local aspect

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 4 — Repo-wide verification

### Task 11: Full build, test, lint sweep

- [ ] **Step 1: Grep for stragglers.**

```bash
grep -rnE "useSelected\b|useSelectionManager\b|SelectionManager\b|createEditorStateStore\b" packages --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Expected: no results in source (only possibly in this plan/spec docs). Fix any remaining references.

- [ ] **Step 2: Cast audit.**

```bash
git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```

Expected: only the two `Result<T>` casts inside `resolveSelection` (carried over from the original `getSelected`, justified by the `Match` return type not relating to `T`) and the backend `as Atom.Writable<T>` / `as unknown as Manager` context-default casts. Justify each with a comment or remove; do not add new unjustified casts.

- [ ] **Step 3: Build everything.**

```bash
moon exec --on-failure continue --quiet :build
```

Expected: no failures. Investigate and fix any.

- [ ] **Step 4: Targeted tests.**

```bash
moon run react-ui-attention:test ui-editor:test plugin-comments:test plugin-trip:test react-ui-table:test
```

Expected: PASS.

- [ ] **Step 5: Lint.**

```bash
moon run :lint -- --fix
```

Expected: clean (or only auto-fixed formatting).

- [ ] **Step 6: Manual smoke (storybook).** Reuse the user's storybook on :9009 (curl check first; never kill it). Verify: a list/table story selects rows (`react-ui-table` or an article story), and a markdown editor story restores scroll/caret on remount. If :9009 is busy, start on another port. Capture confirmation.

- [ ] **Step 7: Commit any fixes.**

```bash
git add -A
git commit -m "chore: fix ViewState migration stragglers across packages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes carried from the spec

- **Personal-space backend is not built** here. The `Backend` contract already permits async hydration, so a `'personal'` backend (ECHO-backed atom in the personal space) can be added later by implementing the interface and adding `'personal'` to `BackendName` + `createDefaultBackends`. No consumer code changes.
- **No legacy localStorage migration.** Old `org.dxos.plugin.markdown.editor/*` entries are abandoned; editor state now lives at `dxos:view-state:editor:<docId>`.
- **Selection mode is carried by the value**, resolved defensively per reader (`resolveSelection`). A context's effective mode is set by writes; unwritten contexts resolve to the requested mode's default.
