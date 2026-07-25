# Story-modules Object-Bound Surface Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `Module.*` role-token indirection in the assistant storybooks with object-bound surface bindings a story declares from `onInit`, rendered by the real composer plugin surfaces.

**Architecture:** `@dxos/story-modules` gains a `Cell` vocabulary (factories producing surface-binding grid cells) and an app-graph adapter in its container (attendableId + graph-path expansion, done once). The `stories-assistant` harness threads `onInit`'s returned layout through a new writable layout-atom capability into the container. Modules that were object→Article wrappers collapse to `Cell.article(object)`; harness-created objects and story-only diagnostics use custom-role `Cell.surface` panels.

**Tech Stack:** TypeScript, React, `@dxos/app-framework` surfaces, `@dxos/app-toolkit` (`AppSurface`, `Paths`, `NotFound`), `@effect-atom/atom-react`, Effect, Storybook 9 (`@storybook/react-vite`), vitest (via moon).

## Global Constraints

- Format with `pnpm format` (oxfmt) and stage the result before every commit — CI runs `oxfmt --check`.
- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`); fix types at source. `as const` is fine.
- New packages are `"private": true`; workspace deps use `workspace:*`. (No new packages here.)
- TypeScript, single quotes, arrow functions, named exports, namespace/barrel imports. Import order: builtin → external → @dxos → internal → parent → sibling.
- Comments say *why* in one load-bearing clause, ending with a period. Audit added comments before each commit.
- Prefer ES `#private`; name a forwarded ref `forwardedRef`. React imports named (`useMemo`, `type Ref`).
- Test after every step: `moon run @dxos/story-modules:test` and `moon run @dxos/stories-assistant:test`. Storybook on port 9009 (reuse the user's running server; never kill it — start on another `--port` if needed).
- Every migration step MUST keep the existing `Module.*`/`args.layout` path working until Phase 5 (both cell forms coexist).

---

## File Structure

**`@dxos/story-modules`** (`packages/stories/story-modules/src/`)
- `Cell.ts` (create) — the `Cell` namespace: `article`, `companion`, `deckCompanion`, `surface`. Pure factories returning `ModuleSpec`.
- `ModuleContainer.tsx` (modify) — extend `ModuleSpec` with the object-bound + override forms; add the app-graph adapter (attendableId + `NotFound.expandPath`) for object cells.
- `Cell.test.ts` (create) — unit tests for the factories.
- `index.ts` (modify) — export `Cell`.

**`@dxos/stories-assistant`** (`packages/stories/stories-assistant/src/`)
- `testing/layout.ts` (create) — the writable layout-atom capability (`StoryLayout.Atom`) + a helper to build the contributing module.
- `testing/decorators.tsx` (modify) — `onInit` returns `ModuleLayout`; capture it in `onClientInitialized`; contribute + set the layout atom from the setup module.
- `testing/ModuleContainer.tsx` (modify) — read the layout atom and pass it as the `layout` prop to the generic container.
- `modules/*.tsx`, `testing/modules.tsx`, `testing/objects.ts` — progressively deleted/trimmed across Phases 4–5.
- `stories/*.stories.tsx` — migrated in Phase 4.

---

## Phase 1 — `Cell` vocabulary + app-graph adapter (`@dxos/story-modules`)

### Task 1: Extend `ModuleSpec` and add the app-graph adapter to the container

**Files:**
- Modify: `packages/stories/story-modules/src/ModuleContainer.tsx`
- Test: `packages/stories/story-modules/src/ModuleContainer.test.tsx` (create)

**Interfaces:**
- Consumes: `AppSurface` (`@dxos/app-toolkit/ui`), `Paths`, `NotFound` (`@dxos/app-toolkit`), `useAppGraph` (`@dxos/app-toolkit/ui`), `Obj` (`@dxos/echo`).
- Produces:
  - Extended `ModuleSpec` union adding two forms:
    - `{ object: Obj.Unknown; token?: Role.Role<any>; data?: Record<string, any>; component?: FC<ResolvedCellProps>; id?: string }` (object-bound)
    - (existing) `Role.Role<any>` and `{ type: Role.Role<any>; data?; id? }` forms unchanged.
  - `export type ResolvedCellProps = { space: Space; object: Obj.Unknown; attendableId: string }`.
  - `ModuleContainer` still takes `{ layout: ModuleLayout; compact?: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `packages/stories/story-modules/src/ModuleContainer.test.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Role } from '@dxos/app-framework';

import { normalizeCell } from './ModuleContainer';

describe('normalizeCell', () => {
  const Token = Role.make<Record<string, any>>('org.dxos.test.token');

  test('role token → surface cell', () => {
    expect(normalizeCell(Token, 'space-1')).toMatchObject({ kind: 'surface', type: Token });
  });

  test('object cell derives collections attendableId', () => {
    const object = { id: 'obj-1' } as any;
    const cell = normalizeCell({ object }, 'space-1');
    expect(cell.kind).toBe('object');
    expect(cell.attendableId).toContain('space-1');
    expect(cell.attendableId).toContain('obj-1');
  });

  test('object cell honors an explicit id override', () => {
    const object = { id: 'obj-1' } as any;
    const cell = normalizeCell({ object, id: 'custom' }, 'space-1');
    expect(cell.id).toBe('custom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run @dxos/story-modules:test -- ModuleContainer.test.tsx`
Expected: FAIL — `normalizeCell` is not exported.

- [ ] **Step 3: Implement the extended spec + `normalizeCell` + app-graph rendering**

In `packages/stories/story-modules/src/ModuleContainer.tsx`, replace the current `ModuleSpec`/`toCell`/`cellAttendableId` block and the render body with the following. Keep the existing imports and add `FC` is already imported; add the new imports at the top group boundaries:

```tsx
import { NotFound, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
```

Spec + normalizer (replace `ModuleSpec`, `ModuleLayout`, `toCell`, `cellAttendableId`):

```tsx
/** Props a resolved object cell's override component receives. */
export type ResolvedCellProps = { space: Space; object: Obj.Unknown; attendableId: string };

/** Object-bound cell: renders the real plugin surface for `object` (or `component`, if given). */
export type ObjectCellSpec = {
  object: Obj.Unknown;
  /** Role token to dispatch (defaults to `AppSurface.Article`). */
  token?: Role.Role<any>;
  /** Extra surface data merged with `{ subject, attendableId }` (e.g. `companionTo`, `variant`). */
  data?: Record<string, any>;
  /** Story override: render this instead of dispatching the plugin surface. */
  component?: FC<ResolvedCellProps>;
  /** Attendable id override (defaults to the object's collections path). */
  id?: string;
};

/** A single grid cell. */
export type ModuleSpec =
  | Role.Role<any>
  | { type: Role.Role<any>; data?: Record<string, any>; id?: string }
  | ObjectCellSpec;

/** 2D layout: outer array = columns, inner array = stacked rows within a column. */
export type ModuleLayout = ModuleSpec[][];

type NormalizedSurfaceCell = { kind: 'surface'; type: Role.Role<any>; data?: Record<string, any>; id: string };
type NormalizedObjectCell = {
  kind: 'object';
  object: Obj.Unknown;
  type: Role.Role<any>;
  data: Record<string, any>;
  component?: FC<ResolvedCellProps>;
  attendableId: string;
  id: string;
};
type NormalizedCell = NormalizedSurfaceCell | NormalizedObjectCell;

const isObjectCell = (spec: ModuleSpec): spec is ObjectCellSpec =>
  typeof spec === 'object' && 'object' in spec && Obj.isObject((spec as ObjectCellSpec).object);

/**
 * Normalizes a `ModuleSpec` cell to a discriminated shape the container renders. Object cells derive
 * their attendable id from the object's space-scoped collections path (the id the app-graph and
 * attention system key object-scoped actions on), unless overridden.
 */
export const normalizeCell = (spec: ModuleSpec, spaceId: string, position = ''): NormalizedCell => {
  if (isObjectCell(spec)) {
    const attendableId = spec.id ?? Paths.getCollectionsPath(spaceId, spec.object.id);
    return {
      kind: 'object',
      object: spec.object,
      type: spec.token ?? AppSurface.Article,
      data: spec.data ?? {},
      component: spec.component,
      attendableId,
      id: attendableId,
    };
  }
  if (typeof spec === 'object' && 'type' in spec) {
    return { kind: 'surface', type: spec.type, data: spec.data, id: spec.id ?? `${spec.type.role}:${position}` };
  }
  return { kind: 'surface', type: spec, id: `${spec.role}:${position}` };
};
```

Now update the render body. Replace the `column.map((spec, moduleIndex) => { ... })` block so it uses `normalizeCell` and, for object cells, expands the graph path and renders the real surface (or the override). Add `const { graph } = useAppGraph();` near the other hooks, and an effect that expands object-cell paths:

```tsx
export const ModuleContainer = ({ layout, compact = false }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const layoutState = useCapability(StorybookCapabilities.LayoutState);
  const { graph } = useAppGraph();
  const [space] = useSpaces();

  useEffect(() => {
    if (space && AppSpace.getActiveSpaceId(atomRegistry.get(layoutState).workspace) !== space.id) {
      atomRegistry.set(layoutState, { ...atomRegistry.get(layoutState), workspace: Paths.getSpacePath(space.id) });
    }
  }, [space, layoutState, atomRegistry]);

  // Materialize object-cell app-graph nodes so object-scoped toolbar/graph actions resolve — the
  // work the deck's navtree normally does on navigation.
  const objectPaths = space
    ? layout
        .flat()
        .map((spec) => normalizeCell(spec, space.id))
        .flatMap((cell) => (cell.kind === 'object' ? [cell.attendableId] : []))
    : [];
  useEffect(() => {
    for (const path of objectPaths) {
      NotFound.expandPath(graph, path);
    }
  }, [graph, objectPaths.join('|')]);

  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return (
    <div
      className={mx('dx-container absolute inset-0 grid', !compact && 'gap-2 p-2')}
      style={{ gridTemplateColumns: `repeat(${layout.length}, minmax(0, 1fr))` }}
    >
      {layout.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className={mx('dx-container grid', !compact && 'gap-2')}
          style={{ gridTemplateRows: `repeat(${column.length}, minmax(0, 1fr))` }}
        >
          {column.map((spec, moduleIndex) => {
            const cell = normalizeCell(spec, space.id, `${columnIndex}:${moduleIndex}`);
            return (
              <AttendableContainer
                key={moduleIndex}
                id={cell.id}
                classNames={mx('border border-separator overflow-hidden', !compact && 'rounded-sm')}
              >
                {cell.kind === 'object' ? (
                  cell.component ? (
                    <cell.component space={space} object={cell.object} attendableId={cell.attendableId} />
                  ) : (
                    <Surface.Surface
                      type={cell.type}
                      data={{ subject: cell.object, attendableId: cell.attendableId, ...cell.data }}
                      limit={1}
                    />
                  )
                ) : (
                  <Surface.Surface type={cell.type} data={{ ...cell.data, space, attendableId: cell.id }} limit={1} />
                )}
              </AttendableContainer>
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `moon run @dxos/story-modules:test -- ModuleContainer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + build the package**

Run: `moon run @dxos/story-modules:build`
Expected: builds clean (no type errors).

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add packages/stories/story-modules/src/ModuleContainer.tsx packages/stories/story-modules/src/ModuleContainer.test.tsx
git commit -m "story-modules: object-bound cells + app-graph adapter in container"
```

### Task 2: `Cell` factory namespace

**Files:**
- Create: `packages/stories/story-modules/src/Cell.ts`
- Create: `packages/stories/story-modules/src/Cell.test.ts`
- Modify: `packages/stories/story-modules/src/index.ts`

**Interfaces:**
- Consumes: `AppSurface` (`@dxos/app-toolkit/ui`), `Role` (`@dxos/app-framework`), `Obj` (`@dxos/echo`), the `ObjectCellSpec`/`ModuleSpec`/`ResolvedCellProps` types from `./ModuleContainer`.
- Produces the `Cell` namespace:
  - `Cell.article(object: Obj.Unknown, opts?: { component?: FC<ResolvedCellProps>; variant?: string; data?: Record<string, any> }): ObjectCellSpec`
  - `Cell.companion(variant: string, object: Obj.Unknown): ObjectCellSpec`
  - `Cell.deckCompanion(variant: string): { type: Role.Role<any>; data: Record<string, any> }`
  - `Cell.surface(token: Role.Role<any>, data?: Record<string, any>, id?: string): { type: Role.Role<any>; data?: Record<string, any>; id?: string }`

- [ ] **Step 1: Write the failing test**

Create `packages/stories/story-modules/src/Cell.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Role } from '@dxos/app-framework';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { Cell } from './Cell';

describe('Cell', () => {
  const object = { id: 'obj-1' } as any;

  test('article binds the object with no explicit token', () => {
    const cell = Cell.article(object);
    expect(cell).toMatchObject({ object });
    expect(cell.token).toBeUndefined();
  });

  test('article variant flows into surface data', () => {
    const cell = Cell.article(object, { variant: 'compact' });
    expect(cell.data).toMatchObject({ variant: 'compact' });
  });

  test('companion sets subject + companionTo', () => {
    const cell = Cell.companion('history', object);
    expect(cell).toMatchObject({ object, data: { subject: 'history', companionTo: object } });
  });

  test('deckCompanion builds the variant token', () => {
    const cell = Cell.deckCompanion('trace');
    expect(cell.type.role).toBe(AppSurface.deckCompanion('trace').role);
  });

  test('surface passes a raw role token + data', () => {
    const Token = Role.make<Record<string, any>>('org.dxos.test.logging');
    expect(Cell.surface(Token, { foo: 1 })).toMatchObject({ type: Token, data: { foo: 1 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run @dxos/story-modules:test -- Cell.test.ts`
Expected: FAIL — cannot find module `./Cell`.

- [ ] **Step 3: Implement `Cell`**

Create `packages/stories/story-modules/src/Cell.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { type Role } from '@dxos/app-framework';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';

import { type ObjectCellSpec, type ResolvedCellProps } from './ModuleContainer';

/**
 * Grid-cell factories for a story layout. Each returns a `ModuleSpec` the container renders as a
 * real plugin surface bound to a concrete object (mirroring composer's `PlankComponent` dispatch),
 * or as a raw role-token surface for panels that are not object-bound.
 */
export namespace Cell {
  type ArticleOptions = { component?: FC<ResolvedCellProps>; variant?: string; data?: Record<string, any> };

  /** Object plank: dispatches the object's real Article surface (or `opts.component` if provided). */
  export const article = (object: Obj.Unknown, opts: ArticleOptions = {}): ObjectCellSpec => ({
    object,
    component: opts.component,
    data: { ...(opts.variant ? { variant: opts.variant } : {}), ...opts.data },
  });

  /** Object companion (e.g. `'history'`, `'comments'`): an Article surface keyed on `companionTo`. */
  export const companion = (variant: string, object: Obj.Unknown): ObjectCellSpec => ({
    object,
    data: { subject: variant, companionTo: object },
  });

  /** Space-scoped deck companion (e.g. `'trace'`) whose surface reads `useActiveSpace()`. */
  export const deckCompanion = (variant: string): { type: Role.Role<any>; data: Record<string, any> } => ({
    type: AppSurface.deckCompanion(variant),
    data: {},
  });

  /** Raw role-token surface for panels that are not object-bound (custom story roles). */
  export const surface = (
    token: Role.Role<any>,
    data?: Record<string, any>,
    id?: string,
  ): { type: Role.Role<any>; data?: Record<string, any>; id?: string } => ({ type: token, data, id });
}
```

- [ ] **Step 4: Export `Cell` from the barrel**

Edit `packages/stories/story-modules/src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Cell';
export * from './ModuleContainer';
```

- [ ] **Step 5: Run tests + build**

Run: `moon run @dxos/story-modules:test -- Cell.test.ts` → Expected: PASS (5 tests).
Run: `moon run @dxos/story-modules:build` → Expected: clean.

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add packages/stories/story-modules/src/Cell.ts packages/stories/story-modules/src/Cell.test.ts packages/stories/story-modules/src/index.ts
git commit -m "story-modules: add Cell factory vocabulary"
```

---

## Phase 2 — Layout-atom capability + `onInit` threading (`stories-assistant`)

### Task 3: Layout-atom capability

**Files:**
- Create: `packages/stories/stories-assistant/src/testing/layout.ts`
- Modify: `packages/stories/stories-assistant/src/testing/index.ts`

**Interfaces:**
- Consumes: `Capability` (`@dxos/app-framework`), `Atom` (`@effect-atom/atom-react`), `ModuleLayout` (`@dxos/story-modules`).
- Produces:
  - `StoryLayout.Atom: Capability.Interface<Atom.Writable<ModuleLayout | undefined>>` — the shared, writable layout atom capability.

- [ ] **Step 1: Implement the capability (no separate unit test — it is a one-line capability handle, exercised by Task 5's story)**

Create `packages/stories/stories-assistant/src/testing/layout.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type ModuleLayout } from '@dxos/story-modules';

/**
 * Writable atom holding the story layout produced by `onInit`. The harness writes it after the
 * space + objects exist; the wrapper `ModuleContainer` reads it and passes it to the generic
 * container. Separate from `StorybookCapabilities.LayoutState` (workspace/deck state).
 */
export namespace StoryLayout {
  export const Atom = Capability.make<Atom.Writable<ModuleLayout | undefined>>('com.example.story.layout');
}
```

- [ ] **Step 2: Export from the testing barrel**

Edit `packages/stories/stories-assistant/src/testing/index.ts` — add after the other exports:

```ts
export * from './layout';
```

- [ ] **Step 3: Build to typecheck**

Run: `moon run @dxos/stories-assistant:build`
Expected: clean (the capability compiles; not yet consumed).

- [ ] **Step 4: Commit**

```bash
pnpm format
git add packages/stories/stories-assistant/src/testing/layout.ts packages/stories/stories-assistant/src/testing/index.ts
git commit -m "stories-assistant: add StoryLayout writable atom capability"
```

### Task 4: Thread `onInit`'s returned layout through the atom

**Files:**
- Modify: `packages/stories/stories-assistant/src/testing/decorators.tsx`
- Modify: `packages/stories/stories-assistant/src/testing/ModuleContainer.tsx`

**Interfaces:**
- Consumes: `StoryLayout.Atom` (Task 3), `Atom` (`@effect-atom/atom-react`), `ModuleLayout`, `useCapability`/`Capabilities.AtomRegistry`, `useAtomValue`.
- Produces:
  - `DecoratorsProps.onInit?: (props: { client: Client; space: Space }) => Promise<ModuleLayout | void>` (return type widened from `void`).
  - The wrapper `ModuleContainer` no longer requires a `layout` arg; it reads `StoryLayout.Atom`.

- [ ] **Step 1: Create the shared atom + holder in `buildPluginManagerOptions`**

In `decorators.tsx`, add imports:

```tsx
import { Atom } from '@effect-atom/atom-react';
import { type ModuleLayout } from '@dxos/story-modules';
import { StoryLayout } from './layout';
```

Widen `onInit`'s type in `DecoratorsProps`:

```tsx
  onInit?: (props: { client: Client; space: Space }) => Promise<ModuleLayout | void>;
```

At the top of `buildPluginManagerOptions` (before the returned options object), create the shared atom + holder:

```tsx
  // Shared per-story: `onInit` fills the holder during client-init; the setup module (which holds
  // the AtomRegistry) copies it into `layoutAtom`, which the wrapper container reads.
  const layoutHolder: { current?: ModuleLayout } = {};
  const layoutAtom = Atom.make<ModuleLayout | undefined>(undefined);
```

- [ ] **Step 2: Capture `onInit`'s return in both `onClientInitialized` paths**

In `onClientInitialized`, replace the two `onInit` call sites so they store the return value. Snapshot path:

```tsx
              if (onInit) {
                layoutHolder.current = (yield* Effect.promise(() => onInit({ client, space }))) || undefined;
              }
```

Non-snapshot path (after the second flush):

```tsx
            if (onInit) {
              layoutHolder.current = (yield* Effect.promise(() => onInit({ client, space }))) || undefined;
            }
```

- [ ] **Step 3: Contribute + set the atom from the StoryPlugin setup module**

`StoryPlugin` is built with `StoryPlugin({ onChatCreated, createAgent })`. Pass the atom + holder in. Change the `StoryPlugin(...)` call in `buildPluginManagerOptions` to:

```tsx
      StoryPlugin({ onChatCreated, createAgent, layoutAtom, layoutHolder }),
```

Extend `StoryPluginOptions`:

```tsx
type StoryPluginOptions = {
  onChatCreated?: (props: { space: Space; chat: Assistant.Chat; binder: AiContext.Binder }) => Promise<void>;
  createAgent?: boolean | CreateAgentOptions;
  layoutAtom?: Atom.Writable<ModuleLayout | undefined>;
  layoutHolder?: { current?: ModuleLayout };
};
```

Add a surfaces-time contribution of the atom, and set it in the setup module. In the `StoryPlugin` `.pipe(...)`, add a new module that contributes the atom capability:

```tsx
  Plugin.addModule(({ layoutAtom }) => ({
    id: 'com.example.plugin.testing.module.layout',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed(layoutAtom ? [Capability.contributes(StoryLayout.Atom, layoutAtom)] : []),
  })),
```

Then, inside the existing setup module (`com.example.plugin.testing.module.setup`), after the workspace switch and object/chat setup completes (end of the `Effect.fnUntraced`), write the holder into the atom:

```tsx
      // Publish the story layout (built by `onInit`) now that the space + objects exist.
      if (layoutAtom && layoutHolder?.current) {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        registry.set(layoutAtom, layoutHolder.current);
      }
```

Destructure `layoutAtom`/`layoutHolder` in the setup module's factory signature: change `Plugin.addModule(({ createAgent, onChatCreated }) => ({` to `Plugin.addModule(({ createAgent, onChatCreated, layoutAtom, layoutHolder }) => ({`.

- [ ] **Step 4: Wrapper container reads the atom**

Replace `packages/stories/stories-assistant/src/testing/ModuleContainer.tsx`'s render + props so the `layout` arg is optional and, when absent, comes from the atom:

```tsx
import { useAtomValue } from '@effect-atom/atom-react';
// ... existing imports ...
import { StoryLayout } from './layout';

export type ModuleContainerProps = Partial<Pick<StoryModuleContainerProps, 'layout'>> & {
  skills?: string[];
};

export const ModuleContainer = ({ layout, skills = [] }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const skillsDefinitions = useCapabilities(AppCapabilities.SkillDefinition);
  const layoutAtom = useCapability(StoryLayout.Atom);
  const resolvedLayout = useAtomValue(layoutAtom) ?? layout ?? [];
  const [space] = useSpaces();

  useAsyncEffect(async () => {
    // ...unchanged skill-binding effect...
  }, [space, skills, skillsDefinitions]);

  return <StoryModuleContainer layout={resolvedLayout} />;
};
```

Note: `useCapability(StoryLayout.Atom)` requires the atom to be contributed — it always is (Task 3's module contributes it whenever the harness runs), so this does not throw.

- [ ] **Step 5: Build to typecheck**

Run: `moon run @dxos/stories-assistant:build`
Expected: clean. Existing stories still pass a static `args.layout` (now optional) — unchanged behavior, because `useAtomValue(layoutAtom)` is `undefined` until a story's `onInit` returns a layout, so `?? layout` wins.

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add packages/stories/stories-assistant/src/testing/decorators.tsx packages/stories/stories-assistant/src/testing/ModuleContainer.tsx
git commit -m "stories-assistant: thread onInit layout through the StoryLayout atom"
```

---

## Phase 3 — Reference migration: `WithMarkdown`

### Task 5: Add the Chat custom-role surface and migrate `WithMarkdown`

**Files:**
- Create: `packages/stories/stories-assistant/src/modules/roles.ts` (custom story roles that survive the migration)
- Modify: `packages/stories/stories-assistant/src/modules/ChatModule.tsx` (register under a role that resolves the latest chat)
- Modify: `packages/stories/stories-assistant/src/testing/modules.tsx` (register the Chat + Logging surfaces under the new roles; keep the old `Module.*` set intact for un-migrated stories)
- Modify: `packages/stories/stories-assistant/src/stories/Documents.stories.tsx` (`WithMarkdown` uses `onInit` → layout)

**Interfaces:**
- Consumes: `Cell` (`@dxos/story-modules`), the existing `ChatModule`/`LoggingModule` components, `Role` (`@dxos/app-framework`).
- Produces:
  - `StoryRole.Chat`, `StoryRole.Logging` role tokens (custom, object-less panels).
  - `WithMarkdown.onInit` returns a `ModuleLayout`; `args.layout` removed from that story.

- [ ] **Step 1: Define the custom story roles**

Create `packages/stories/stories-assistant/src/modules/roles.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';

/** Custom roles for story panels that are NOT bound to a story-created object (harness chat, diagnostics). */
export const StoryRole = {
  Chat: Role.make<Record<string, any>>('org.dxos.storybook.role.chat'),
  Logging: Role.make<Record<string, any>>('org.dxos.storybook.role.logging'),
};
```

- [ ] **Step 2: Register Chat + Logging surfaces under the custom roles**

In `packages/stories/stories-assistant/src/testing/modules.tsx`, add (do not remove the existing `Module`/`moduleSurfaces`) at the end of `moduleSurfaces` a Chat + Logging surface keyed on `StoryRole`. Import `StoryRole` and the space-scoped wrapper. Because these panels are space-scoped (not object-bound), register them so the container's surface-cell branch (`data: { space, attendableId }`) reaches them:

```tsx
import { StoryRole } from '../modules/roles';

// ...append to moduleSurfaces:
  Surface.create({
    id: 'role.chat',
    filter: Surface.makeFilter(StoryRole.Chat),
    component: withModuleProps(ChatModule),
  }),
  Surface.create({
    id: 'role.logging',
    filter: Surface.makeFilter(StoryRole.Logging),
    component: withModuleProps(LoggingModule),
  }),
```

(`ChatModule` already resolves the latest `Assistant.Chat` itself and renders `Chat.Root`; leaving it as a custom-role panel is the harness-created-object path from the spec. Converting it to delegate to the real `ChatArticle` is a follow-up, out of this task's scope.)

- [ ] **Step 3: Migrate `WithMarkdown` to `onInit` → layout**

In `packages/stories/stories-assistant/src/stories/Documents.stories.tsx`, update imports and the `WithMarkdown` story. Add `Cell` and `StoryRole`:

```tsx
import { Cell } from '@dxos/story-modules';
import { StoryRole } from '../modules/roles';
```

Change `WithMarkdown` so `onInit` returns the layout and `args.layout` is removed:

```tsx
export const WithMarkdown: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { CommentsPlugin }, { SpacePlugin }, { VersioningPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-comments/plugin'),
        import('@dxos/plugin-space/plugin'),
        import('@dxos/plugin-versioning/plugin'),
      ]);
      return { plugins: [MarkdownPlugin(), CommentsPlugin(), SpacePlugin({}), VersioningPlugin()] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const document = space.db.add(
        Markdown.make({
          name: 'DXOS',
          content: addSpellingMistakes(MARKDOWN_DOCUMENT, 3, '!!!').replaceAll(/(?<!\n)\n(?!\n)/g, '\n\n'),
        }),
      );
      const styleGuide = space.db.add(Markdown.make({ name: 'Style Guide', content: STYLE_GUIDE }));
      addToRootCollection(space, [document, styleGuide]);
      return [
        [Cell.surface(StoryRole.Chat)],
        [Cell.article(document)],
        [Cell.companion('history', document), Cell.companion('comments', document)],
        [Cell.surface(StoryRole.Logging)],
      ];
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    skills: [AssistantSkill.key, MarkdownSkill.key, CommentSkill.key],
  },
};
```

- [ ] **Step 4: Verify the interaction test still passes**

`WithMarkdown` has no `play`, but `WithMarkdownStyleGuide` spreads it and is `!test`-tagged. Run the story-group tests:

Run: `moon run @dxos/stories-assistant:test -- Documents`
Expected: PASS (the non-`!test` `WithMarkdown`/`WithSkills`/`WithScript` render without error).

- [ ] **Step 5: Visually verify in storybook**

Reuse the running storybook (curl `http://localhost:9009` first; if absent start `moon run storybook-react:serve` or `--port 9010`). Open `stories/stories-assistant/Documents › WithMarkdown`. Confirm four columns render: chat (left), the DXOS editor, history+comments companions stacked, logging. Confirm the editor's comment toolbar button appears (proves graph-path expansion via the app-graph adapter).

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add packages/stories/stories-assistant/src/modules/roles.ts packages/stories/stories-assistant/src/testing/modules.tsx packages/stories/stories-assistant/src/stories/Documents.stories.tsx
git commit -m "stories-assistant: migrate WithMarkdown to onInit surface-grid layout"
```

---

## Phase 4 — Migrate remaining stories

### Task 6: Classify modules and record the `Module.* → Cell` mapping

**Files:**
- Create: `packages/stories/stories-assistant/MIGRATION.md` (temporary working note; deleted in Task 9)

**Interfaces:**
- Produces: a table mapping each `Module.*` used by a story to its replacement: `Cell.article(object)`, `Cell.companion(variant, object)`, `Cell.deckCompanion(variant)`, or `Cell.surface(StoryRole.X)` (custom role for object-less/diagnostic panels).

- [ ] **Step 1: Enumerate every `Module.*` referenced across `src/stories/*.stories.tsx`**

Run: `grep -rhoE "Module\.[A-Za-z]+" packages/stories/stories-assistant/src/stories | sort -u`
Record the set.

- [ ] **Step 2: Classify each by inspecting its `*Module.tsx`**

For each module component, decide the category by what it renders:
- Renders `AppSurface.Article` with `{ subject: object }` for a **story-created** object → `Cell.article(object)`.
- Renders `AppSurface.Article` with `{ subject: variant, companionTo: object }` → `Cell.companion(variant, object)`.
- Renders `AppSurface.deckCompanion(...)` / reads `useActiveSpace()` only → `Cell.deckCompanion(variant)` or `Cell.surface(StoryRole.X)`.
- Renders a bespoke panel with no plugin surface, or resolves a harness-created object → `Cell.surface(StoryRole.X)` (add a `StoryRole.X` token + register its surface, as in Task 5 Step 1–2).

Write the mapping table into `MIGRATION.md`. This table is the authority for Tasks 7–8.

- [ ] **Step 3: Commit the working note**

```bash
git add packages/stories/stories-assistant/MIGRATION.md
git commit -m "stories-assistant: record Module→Cell migration mapping"
```

### Task 7: Migrate each remaining story file (repeat per file)

**Files (one iteration per file):** `Chat.stories.tsx`, `Data.stories.tsx`, `Artifacts.stories.tsx`, `Sketch.stories.tsx`, `Automation.stories.tsx`, `Connectors.stories.tsx`, and the remaining `Documents.stories.tsx` stories (`WithSkills`, `WithScript`).

**Interfaces:**
- Consumes: the Task 6 mapping table; `Cell`, `StoryRole`.
- Produces: each story's layout produced by `onInit` (return `ModuleLayout`), `args.layout` removed.

For EACH story object in the file, apply this exact recipe:

- [ ] **Step 1: Move object creation into `onInit` and capture references**

Objects the layout binds must be created in `onInit` and held in locals (e.g. `const tasks = space.db.add(Markdown.make({ name: 'Tasks' }));`). Keep any existing `onInit` side effects. `addToRootCollection(space, [...])` for objects that need app-graph nodes (any `Cell.article`/`Cell.companion` target).

- [ ] **Step 2: Translate `args.layout` to a returned layout using the mapping table**

Replace each `Module.X` cell with its mapping-table replacement, binding the local object reference. Example (from `WithSkills`): `[[Module.Chat], [Module.Tasks, Module.Skill]]` → `return [[Cell.surface(StoryRole.Chat)], [Cell.article(tasks), Cell.surface(StoryRole.Skill)]];` (Skill panel is object-less → custom role). Remove `layout` from `args`.

- [ ] **Step 3: Add any missing `StoryRole.X` + surface registration**

For every `Cell.surface(StoryRole.X)` the file needs, ensure `StoryRole.X` exists in `modules/roles.ts` and a `Surface.create({ id: 'role.x', filter: Surface.makeFilter(StoryRole.X), component: withModuleProps(XModule) })` exists in `testing/modules.tsx`.

- [ ] **Step 4: Test + verify**

Run: `moon run @dxos/stories-assistant:test -- <StoryFileBaseName>` (e.g. `Data`).
Expected: PASS. Then visually confirm the migrated stories in storybook (as Task 5 Step 5). Re-run any `play`/`test`-tagged interaction stories in the file to confirm they still pass.

- [ ] **Step 5: Format and commit (one commit per file)**

```bash
pnpm format
git add packages/stories/stories-assistant/src
git commit -m "stories-assistant: migrate <File> stories to surface-grid layout"
```

Repeat Task 7 for every file listed above before proceeding to Phase 5.

---

## Phase 5 — Delete the `Module.*` indirection

### Task 8: Remove obsolete wrappers, tokens, and `useActiveObject`

**Files:**
- Modify: `packages/stories/stories-assistant/src/testing/modules.tsx` — delete every `Module.*` token and `moduleSurfaces` entry whose module became a pure `Cell.article`/`Cell.companion` binding; keep only the residual custom-role (`StoryRole.*`) surfaces.
- Delete: each `packages/stories/stories-assistant/src/modules/<X>Module.tsx` that is no longer referenced by any surface registration.
- Modify: `packages/stories/stories-assistant/src/modules/index.ts` — drop deleted exports.
- Modify: `packages/stories/stories-assistant/src/testing/objects.ts` — delete `useActiveObject` (no longer used); keep `addToRootCollection`.
- Modify: `packages/stories/stories-assistant/src/testing/ModuleContainer.tsx` — no `layout` arg remains; keep the atom read.

**Interfaces:**
- Consumes: nothing new.
- Produces: a codebase where `onInit` is the sole layout source and no `Module.*` token exists.

- [ ] **Step 1: Find dead references**

Run: `grep -rn "Module\.\|moduleSurfaces\|useActiveObject" packages/stories/stories-assistant/src`
Expected after migration: only definitions in `modules.tsx`/`objects.ts`, no story usages.

- [ ] **Step 2: Delete unreferenced modules + tokens**

For each `*Module.tsx` not referenced by a surviving `Surface.create` in `modules.tsx`, delete the file and its `modules/index.ts` export. Delete the corresponding `Module.*` token and `moduleSurfaces` entry. Delete `useActiveObject` from `objects.ts`.

- [ ] **Step 3: Delete the temporary migration note**

```bash
git rm packages/stories/stories-assistant/MIGRATION.md
```

- [ ] **Step 4: Full package build + test**

Run: `moon run @dxos/stories-assistant:build` → Expected: clean (no unresolved imports).
Run: `moon run @dxos/stories-assistant:test` → Expected: PASS.
Run: `moon run @dxos/story-modules:test` → Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add -A packages/stories/stories-assistant
git commit -m "stories-assistant: remove Module.* indirection and useActiveObject"
```

### Task 9: Final verification sweep

- [ ] **Step 1: Confirm no `Module.*`/`args.layout` residue**

Run: `grep -rn "args.*layout\|Module\.[A-Z]" packages/stories/stories-assistant/src/stories`
Expected: no matches.

- [ ] **Step 2: Lint both packages**

Run: `moon run @dxos/story-modules:lint && moon run @dxos/stories-assistant:lint`
Expected: clean.

- [ ] **Step 3: Storybook smoke test of every migrated story group**

Open each group (Documents, Chat, Data, Artifacts, Sketch, Automation, Connectors) in storybook; confirm no console errors and each layout renders its bound objects.

- [ ] **Step 4: Changeset**

If these packages are consumer-relevant, add a `.changeset/*.md` per `agents/instructions/changesets.md`. (Both are `private: true` story packages — likely no changeset needed; confirm against the instructions.)

- [ ] **Step 5: Commit any final formatting**

```bash
pnpm format
git add -A
git commit -m "stories-assistant: final surface-grid migration cleanup" || echo "nothing to commit"
```

---

## Self-Review Notes (author)

- **Spec coverage:** §1 vocabulary → Task 2; §2 app-graph adapter → Task 1; §3 layout-from-onInit → Tasks 3–4; §4 module fate → Tasks 5–8 (object→article, companions, deckCompanion, custom roles for harness-created/diagnostic panels); §5 end state (`args.layout` deleted) → Task 8; task #4 lazyPlugins already verified (spec "Related verification"). Covered.
- **Override:** `Cell.article(object, { component })` (Task 2) + the container's `cell.component` branch (Task 1) implement the story override.
- **Type consistency:** `ObjectCellSpec`/`ResolvedCellProps`/`normalizeCell` are defined in Task 1 and consumed by Task 2's `Cell`; `StoryLayout.Atom` defined in Task 3, contributed in Task 4, read in Task 4's wrapper; `StoryRole` defined in Task 5, extended in Tasks 6–7.
- **Coexistence:** Tasks 1–4 keep `Module.*`/`args.layout` working; only Task 8 removes them, after all stories are migrated.
