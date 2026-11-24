# DebugPanel as a graph application — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The floating debug panel gets a left-hand navtree over a new hidden `root/debug` app-graph category and renders the selected node's article on the right; devtools and debug trees move there from the main navtree's System group.

**Architecture:** plugin-debug contributes a hidden `root/debug` node (plus `console`/`logs` nodes with article surfaces); tool plugins attach under it with `AppNodeMatcher.whenDebugGroup`. The graph-to-`TreeModel` mapping is extracted from plugin-navtree into `@dxos/plugin-graph/hooks` (`createGraphTreeModel`), with open/current state supplied by the caller; the panel supplies atoms derived from its own persisted `ViewState`, so selection never touches the deck or URL.

**Tech Stack:** Effect atoms (`effect/unstable/reactivity/Atom`), `@dxos/app-graph` (`AppGraphBuilder.createExtension`, `setupGraphBuilder`), `@dxos/react-ui-list` `Tree`, `@dxos/react-ui` `Splitter`/`FloatingPanel`, `@dxos/react-ui-attention` `ViewState`, `@dxos/app-framework/ui` `Surface`, vitest, storybook.

**Spec:** `packages/plugins/plugin-debug/docs/DESIGN.md`

## Global Constraints

- Branch `claude/plugin-higgsfield-generation-7ee65d`, worktree `.claude/worktrees/session-url-binding-error-7c6458`; commits `scope: description` + `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`; `pnpm oxfmt <files>` before each commit; include the user's uncommitted edits in every commit.
- No casts to silence the type checker; comments say _why_ in one clause; no wrapper divs in containers; toolbars via `MenuBuilder`/`Menu.Root` if any are added.
- Run tests as `pnpm --filter <pkg> exec vitest run --project=node <file>` from the worktree root; typecheck as `npx tsc --noEmit -p packages/.../tsconfig.json` (do not `moon run :build` while the storybook is up).
- Nothing under `root/debug` declares a `url` binding. Selecting in the debug tree never invokes `LayoutOperation.*`.
- The debug tree is global-only: no per-space enumeration; space tools read the active workspace (`useActiveSpace`).
- Storybook: reuse the server on 9009 (`preview_start storybook-react`) — never start a second one; verify stories in the in-app browser and with `vitest --project=storybook`.

---

### Task 1: The `debug` category constants and matcher

**Files:**

- Modify: `packages/sdk/app-toolkit/src/app/GraphPath.ts` (`GroupSegments`, `GroupTypes`)
- Modify: `packages/sdk/app-toolkit/src/app-graph/AppNodeMatcher.ts`
- Test: `packages/sdk/app-toolkit/src/app-graph/AppNodeMatcher.test.ts` (create)

**Interfaces:**

- Produces: `GraphPath.GroupSegments.debug === 'debug'`, `GraphPath.GroupTypes.debug === 'org.dxos.navtree.group.debug'`, `AppNodeMatcher.whenDebugGroup: (node: AppGraphNode.Node) => Option.Option<AppGraphNode.Node>`.

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as GraphPath from '../app/GraphPath.ts';
import * as AppNodeMatcher from './AppNodeMatcher.ts';

describe('AppNodeMatcher.whenDebugGroup', () => {
  test('matches the debug category node and nothing else', ({ expect }) => {
    const debug = { id: `${GraphNode.RootId}/debug`, type: GraphPath.GroupTypes.debug, data: null, properties: {} };
    const system = {
      id: `${GraphNode.RootId}/x/system`,
      type: GraphPath.GroupTypes.system,
      data: null,
      properties: {},
    };
    expect(Option.isSome(AppNodeMatcher.whenDebugGroup(debug))).toBe(true);
    expect(Option.isNone(AppNodeMatcher.whenDebugGroup(system))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @dxos/app-toolkit exec vitest run --project=node src/app-graph/AppNodeMatcher.test.ts`
Expected: FAIL — `whenDebugGroup` is not exported / `GroupTypes.debug` undefined.

- [ ] **Step 3: Add the constants and matcher**

In `GraphPath.ts` append `debug: 'debug'` to `GroupSegments` and `debug: 'org.dxos.navtree.group.debug'` to `GroupTypes` (keep the existing key order, add last). In `AppNodeMatcher.ts`:

```ts
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import * as GraphPath from '../app/GraphPath.ts';

/**
 * Match the hidden `debug` category node under the graph root — the root of the debug panel's
 * tree. Developer tools attach here instead of a space's System group so they never show in the
 * main navtree or open as deck planks.
 */
export const whenDebugGroup = GraphNodeMatcher.whenNodeType(GraphPath.GroupTypes.debug);
```

Change the existing `import type * as GraphNodeMatcher` to a value import (it is now called). Check `GraphPath.ts` does not import `AppNodeMatcher` (it does not, per its import list) so there is no cycle.

- [ ] **Step 4: Run the test and the package typecheck**

Run: `pnpm --filter @dxos/app-toolkit exec vitest run --project=node src/app-graph/AppNodeMatcher.test.ts && npx tsc --noEmit -p packages/sdk/app-toolkit/tsconfig.json`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
pnpm oxfmt packages/sdk/app-toolkit/src/app/GraphPath.ts packages/sdk/app-toolkit/src/app-graph/AppNodeMatcher.ts packages/sdk/app-toolkit/src/app-graph/AppNodeMatcher.test.ts
git add -A && git commit -m "app-toolkit: debug navtree category and whenDebugGroup matcher"
```

---

### Task 2: plugin-debug contributes `root/debug` with console and logs nodes

**Files:**

- Modify: `packages/plugins/plugin-debug/src/types/DebugNodes.ts`
- Modify: `packages/plugins/plugin-debug/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-debug/src/capabilities/react-surface.ts`
- Modify: `packages/plugins/plugin-debug/src/translations.ts`
- Test: `packages/plugins/plugin-debug/src/capabilities/app-graph-builder.test.ts` (create)

**Interfaces:**

- Consumes: `GraphPath.GroupSegments.debug`, `GraphPath.GroupTypes.debug`, `AppNodeMatcher.whenDebugGroup` (Task 1).
- Produces: `DebugNodes.DEBUG_ROOT_ID = \`${GraphNode.RootId}/debug\``, `DebugNodes.Console`, `DebugNodes.Logs`(string literals used as node`data`), exported `createDebugRootExtension()`and`createDebugToolsExtension()`factories; article surfaces for`DebugNodes.Console`(→`<DebugConsole fit />`) and `DebugNodes.Logs`(→`<LoggerPanel />`).

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';

import { DebugNodes } from '#types';

import { createDebugRootExtension, createDebugToolsExtension } from './app-graph-builder.ts';

describe('debug graph extensions', () => {
  const setup = async () => {
    const rootExtensions = await EffectEx.runPromise(createDebugRootExtension());
    const toolExtensions = await EffectEx.runPromise(createDebugToolsExtension());
    const context = setupGraphBuilder({ extensions: [...rootExtensions, ...toolExtensions] });
    await context.expand(GraphNode.RootId);
    await context.expand(DebugNodes.DEBUG_ROOT_ID);
    return context;
  };

  test('root/debug is a hidden root child', async ({ expect }) => {
    const { graph } = await setup();
    const node = Option.getOrThrow(AppGraph.getNode(graph, DebugNodes.DEBUG_ROOT_ID));
    expect(AppGraphNode.hasDisposition(node, 'hidden')).toBe(true);
    expect(node.data).toBeNull();
  });

  test('console and logs are its first children, in that order', async ({ expect }) => {
    const { getConnections } = await setup();
    const ids = getConnections(DebugNodes.DEBUG_ROOT_ID).map((node) => node.id);
    expect(ids.slice(0, 2)).toEqual([
      `${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Console)}`,
      `${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Logs)}`,
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @dxos/plugin-debug exec vitest run --project=node src/capabilities/app-graph-builder.test.ts`
Expected: FAIL — factories not exported.

- [ ] **Step 3: Add the node ids**

`DebugNodes.ts` additions (keep the existing exports):

```ts
import * as GraphNode from '@dxos/graph/GraphNode';

/** Qualified id of the hidden debug category, the root of the debug panel's tree. */
export const DEBUG_ROOT_ID = `${GraphNode.RootId}/debug`;

/** Node data of the Effect-CLI console page. */
export const Console = `${debugId}.console`;

/** Node data of the log viewer page. */
export const Logs = `${debugId}.logs`;
```

- [ ] **Step 4: Add the extensions**

In `app-graph-builder.ts` add two exported factories and register them in the module's `Effect.all([...])` list (leave the existing `debug`, `debugObject`, `spaceObjects` extensions alone in this task):

```ts
/** The hidden category every developer tool hangs off: a root child the main navtree filters out. */
export const createDebugRootExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'debugRoot',
    match: GraphNodeMatcher.whenRoot,
    connector: () =>
      Effect.succeed([
        AppGraphNode.make({
          id: GraphPath.GroupSegments.debug,
          type: GraphPath.GroupTypes.debug,
          data: null,
          properties: {
            label: ['debug-panel.title', { ns: meta.profile.key }],
            icon: 'ph--bug--regular',
            disposition: 'hidden',
            draggable: false,
            droppable: false,
          },
        }),
      ]),
  });

/** The panel's own pages, first in the tree: the console and the log viewer. */
export const createDebugToolsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'debugTools',
    match: AppNodeMatcher.whenDebugGroup,
    connector: () =>
      Effect.succeed([
        AppGraphNode.make({
          id: DebugNodes.nodeId(DebugNodes.Console),
          type: DebugNodes.Console,
          data: DebugNodes.Console,
          properties: {
            label: ['console.tab.label', { ns: meta.profile.key }],
            icon: 'ph--terminal-window--regular',
            position: Position.first,
          },
        }),
        AppGraphNode.make({
          id: DebugNodes.nodeId(DebugNodes.Logs),
          type: DebugNodes.Logs,
          data: DebugNodes.Logs,
          properties: {
            label: ['logs.tab.label', { ns: meta.profile.key }],
            icon: 'ph--list-bullets--regular',
            position: Position.first + 1,
          },
        }),
      ]),
  });
```

`Position.first` is a number in `@dxos/util` (check `Position.first + 1` typechecks; if `Position` is not numeric, use explicit `position: 0` / `1`). Imports needed: `GraphNodeMatcher` from `@dxos/graph/GraphNodeMatcher`, `AppNodeMatcher` (already), `GraphPath` (already), `DebugNodes` (already), `Position` (already).

- [ ] **Step 5: Add the article surfaces**

In `react-surface.ts` add (imports: `DebugConsole` from `#containers`; `LoggerPanel` is already imported):

```ts
      Surface.create({
        id: 'console',
        filter: AppSurface.literal(AppSurface.Article, DebugNodes.Console),
        component: () => <DebugConsole fit />,
      }),
      Surface.create({
        id: 'logsArticle',
        filter: AppSurface.literal(AppSurface.Article, DebugNodes.Logs),
        component: LoggerPanel,
      }),
```

`react-surface.ts` is a `.ts` file: if JSX is not allowed there, add `DebugConsoleArticle = () => <DebugConsole fit />` to `DebugSurfaces.tsx` and reference it. Confirm `DebugConsole` is exported from `#containers` (`containers/index.ts`); add the export if missing.

- [ ] **Step 6: Run the test, typecheck, lint**

Run: `pnpm --filter @dxos/plugin-debug exec vitest run --project=node src/capabilities/app-graph-builder.test.ts && npx tsc --noEmit -p packages/plugins/plugin-debug/tsconfig.json && moon run plugin-debug:lint`
Expected: 2 passed; clean.

- [ ] **Step 7: Commit**

```bash
pnpm oxfmt packages/plugins/plugin-debug/src
git add -A && git commit -m "plugin-debug: hidden root/debug category with console and logs nodes"
```

---

### Task 3: `createGraphTreeModel` in plugin-graph; plugin-navtree wraps it

**Files:**

- Create: `packages/plugins/plugin-graph/src/hooks/useGraphTreeModel.ts`
- Create: `packages/plugins/plugin-graph/src/hooks/graph-tree-model.test.ts`
- Modify: `packages/plugins/plugin-graph/src/hooks/index.ts`
- Modify: `packages/plugins/plugin-graph/package.json` (+ `@dxos/react-ui-list` dependency, `workspace:*`), `tsconfig.json` references
- Modify: `packages/plugins/plugin-navtree/src/hooks/useNavTreeModel.ts` (becomes a wrapper)

**Interfaces:**

- Produces:

```ts
export type GraphTreeState = {
  /** Open state keyed by the joined path (react-ui-list `Path.create`). */
  itemOpen: (path: string[]) => Atom.Atom<boolean>;
  /** Selected state keyed by the joined path. */
  itemCurrent: (path: string[]) => Atom.Atom<boolean>;
};
export type GraphTreeModelOptions = GraphTreeState & {
  /** Extra visibility filter for children (plugin-navtree hides plank companions here); `hidden` nodes are always filtered. */
  isVisible?: (node: AppGraphNode.Node) => boolean;
};
export const createGraphTreeModel = (graph: AppGraph.ReadableGraph, rootId: string, options: GraphTreeModelOptions): TreeModel<AppGraphNode.Node>;
export const useGraphTreeModel = (rootId: string, options: GraphTreeModelOptions): TreeModel<AppGraphNode.Node>;
```

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Path } from '@dxos/react-ui-list';

import { createGraphTreeModel } from './useGraphTreeModel.ts';

describe('createGraphTreeModel', () => {
  const setup = async () => {
    const extensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'test',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            { id: 'a', type: 'page', data: 'a', properties: { label: 'A' } },
            { id: 'hidden', type: 'page', data: 'h', properties: { label: 'H', disposition: 'hidden' } },
            {
              id: 'group',
              type: 'group',
              data: null,
              properties: { label: 'G', disposition: 'group' },
              nodes: [{ id: 'b', type: 'page', data: 'b', properties: { label: 'B' } }],
            },
          ]),
      }),
    );
    const context = setupGraphBuilder({ extensions });
    await context.expand(GraphNode.RootId);
    await context.expand(`${GraphNode.RootId}/group`);
    const openPaths = new Set<string>();
    const openAtom = Atom.make(openPaths);
    const model = createGraphTreeModel(context.graph, GraphNode.RootId, {
      itemOpen: (path) => Atom.make((get) => get(openAtom).has(Path.create(...path))),
      itemCurrent: (path) => Atom.make(() => Path.last(Path.create(...path)) === `${GraphNode.RootId}/b`),
    });
    return { ...context, model };
  };

  test('lists visible children of the root, dropping hidden nodes', async ({ expect }) => {
    const { registry, model } = await setup();
    expect(registry.get(model.childIds())).toEqual([`${GraphNode.RootId}/a`, `${GraphNode.RootId}/group`]);
  });

  test('maps node properties to row props; groups are disabled, undraggable, not branches', async ({ expect }) => {
    const { registry, model } = await setup();
    const group = registry.get(model.itemProps([GraphNode.RootId, `${GraphNode.RootId}/group`]));
    expect(group.disposition).toBe('group');
    expect(group.disabled).toBe(true);
    expect(group.draggable).toBe(false);
    expect(group.parentOf).toBeUndefined();
    const page = registry.get(model.itemProps([GraphNode.RootId, `${GraphNode.RootId}/a`]));
    expect(page.label).toBe('A');
  });

  test('current comes from the caller', async ({ expect }) => {
    const { registry, model } = await setup();
    expect(
      registry.get(model.itemCurrent([GraphNode.RootId, `${GraphNode.RootId}/group`, `${GraphNode.RootId}/b`])),
    ).toBe(true);
    expect(registry.get(model.itemCurrent([GraphNode.RootId, `${GraphNode.RootId}/a`]))).toBe(false);
  });
});
```

(Confirm how `setupGraphBuilder` qualifies child ids — the existing `project-chats.test.ts` in plugin-projects uses `GraphNode.qualifyId(parentId, segment)` producing `root/<segment>`; adjust the expected ids to match if the separator differs.)

- [ ] **Step 2: Add the dependency and run the test to verify it fails**

```bash
pnpm add --filter @dxos/plugin-graph "@dxos/react-ui-list@workspace:*"
```

Add `{ "path": "../../ui/react-ui-list" }` to `packages/plugins/plugin-graph/tsconfig.json` references (mirror the neighbouring entries).

Run: `pnpm --filter @dxos/plugin-graph exec vitest run --project=node src/hooks/graph-tree-model.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `useGraphTreeModel.ts`**

Move the graph half of `plugin-navtree/src/hooks/useNavTreeModel.ts` verbatim (the `createItemPropsFamily`, `createChildIdsFamily`, `createItemFamily` bodies), parameterised on the caller's state:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import type * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Path, type TreeModel } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

export type GraphTreeState = {
  /** Open state keyed by the joined path (`Path.create`). */
  itemOpen: (path: string[]) => Atom.Atom<boolean>;
  /** Selected state keyed by the joined path. */
  itemCurrent: (path: string[]) => Atom.Atom<boolean>;
};

export type GraphTreeModelOptions = GraphTreeState & {
  /** Extra child filter on top of the `hidden` disposition (the navtree drops plank companions here). */
  isVisible?: (node: AppGraphNode.Node) => boolean;
};

/** Rows the tree lists: not hidden, and either a plain node or an action the graph marks as an item. */
const isItem = (node: AppGraphNode.Node): boolean =>
  !AppGraphNode.hasDisposition(node, 'hidden') &&
  (!AppGraphNode.isAction(node) || AppGraphNode.hasDisposition(node, 'item'));

/**
 * A `TreeModel` over the app graph: topology and row props come from the graph, open/current state
 * from the caller, so one mapping serves the navtree (persisted state) and any other tree host.
 */
export const createGraphTreeModel = (
  graph: AppGraph.ReadableGraph,
  rootId: string,
  { itemOpen, itemCurrent, isVisible = () => true }: GraphTreeModelOptions,
): TreeModel<AppGraphNode.Node> => {
  const isVisibleChild = (node: AppGraphNode.Node) => !AppGraphNode.hasDisposition(node, 'hidden') && isVisible(node);

  const itemPropsFamily = Atom.family((pathKey: string) => {
    const path = Path.parts(pathKey);
    const id = Path.last(pathKey);
    return Atom.make((get) => {
      const node = Option.getOrUndefined(get(graph.node(id)));
      if (!node) {
        return { id, label: id };
      }
      const safeChildren = get(graph.connections(node.id, 'child')).filter((child) => !path.includes(child.id));
      const visibleChildren = safeChildren.filter(isVisibleChild);
      const parentOf =
        visibleChildren.length > 0
          ? visibleChildren.map((child) => child.id)
          : node.properties.role === 'branch'
            ? []
            : undefined;
      const parentId = path.length >= 2 ? path[path.length - 2] : undefined;
      const parentNode = parentId ? Option.getOrUndefined(get(graph.node(parentId))) : undefined;
      const droppable =
        node.properties.droppable === false || parentNode?.properties.childrenDroppable === false ? false : undefined;
      const disposition = node.properties.disposition as string | undefined;
      const isGroup = disposition === 'group';
      return {
        id: node.id,
        parentOf: isGroup ? undefined : parentOf,
        disposition,
        disabled: isGroup || node.properties.disabled,
        draggable: isGroup ? false : node.properties.draggable,
        droppable: isGroup ? false : droppable,
        label: node.properties.label ?? node.id,
        className: mx(node.properties.className, node.properties.modified && 'italic'),
        headingClassName: node.properties.headingClassName,
        icon: node.properties.icon,
        iconHue: node.properties.iconHue,
        testId: node.properties.testId,
        count: node.properties.count,
        modifiedCount: node.properties.modifiedCount,
      };
    }).pipe(Atom.keepAlive);
  });

  const childIdsFamily = Atom.family((id: string) =>
    Atom.make((get) =>
      get(graph.connections(id, 'child'))
        .filter(isVisibleChild)
        .map((child) => child.id),
    ).pipe(Atom.keepAlive),
  );

  const itemFamily = Atom.family((id: string) =>
    Atom.make((get) => {
      const node = Option.getOrUndefined(get(graph.node(id)));
      return node && isItem(node) ? node : undefined;
    }).pipe(Atom.keepAlive),
  );

  const itemOpenFamily = Atom.family((pathKey: string) => itemOpen(Path.parts(pathKey)));
  const itemCurrentFamily = Atom.family((pathKey: string) => itemCurrent(Path.parts(pathKey)));

  return {
    item: (id) => itemFamily(id),
    itemProps: (path) => itemPropsFamily(Path.create(...path)),
    itemOpen: (path) => itemOpenFamily(Path.create(...path)),
    itemCurrent: (path) => itemCurrentFamily(Path.create(...path)),
    childIds: (parentId) => childIdsFamily(parentId ?? rootId),
  };
};

/** {@link createGraphTreeModel} over the app graph capability, memoised on its inputs. */
export const useGraphTreeModel = (rootId: string, options: GraphTreeModelOptions): TreeModel<AppGraphNode.Node> => {
  const { graph } = useAppGraph();
  const { itemOpen, itemCurrent, isVisible } = options;
  return useMemo(
    () => createGraphTreeModel(graph, rootId, { itemOpen, itemCurrent, isVisible }),
    [graph, rootId, itemOpen, itemCurrent, isVisible],
  );
};
```

Note one deliberate difference from the navtree original: `childIds` now filters hidden children (the original relied on `item()` returning `undefined` for hidden nodes). Keep it — the navtree's `Tree` skips `undefined` items either way, so behaviour is unchanged, and the debug tree gets correct `last`-row flags. Add `export * from './useGraphTreeModel.ts';` to `hooks/index.ts`. `@dxos/ui-theme` must be a dependency of plugin-graph — add it with `pnpm add --filter @dxos/plugin-graph "@dxos/ui-theme@workspace:*"` if `mx` fails to resolve (check `package.json` first).

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @dxos/plugin-graph exec vitest run --project=node src/hooks/graph-tree-model.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Make plugin-navtree's hook a wrapper**

Replace the body of `packages/plugins/plugin-navtree/src/hooks/useNavTreeModel.ts` with:

```ts
//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { useGraphTreeModel } from '@dxos/plugin-graph/hooks';
import { type TreeModel } from '@dxos/react-ui-list';

import { NavTreeNode } from '#types';

import { useNavTreeState } from './useNavTreeState.ts';

// TODO(wittjosiah): Move companion nodes to their own edge category so this filter is unnecessary.
const isVisible = (node: AppGraphNode.Node): boolean => node.type !== DeckSchema.PLANK_COMPANION_TYPE;

/** The graph tree model with the navtree's persisted open/current state. */
export const useNavTreeModel = (rootId: string): TreeModel<NavTreeNode.NavTreeItemGraphNode> => {
  const { getItemAtom } = useNavTreeState();
  const state = useMemo(
    () => ({
      itemOpen: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).open).pipe(Atom.keepAlive),
      itemCurrent: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).current).pipe(Atom.keepAlive),
      isVisible,
    }),
    [getItemAtom],
  );
  return useGraphTreeModel(rootId, state);
};
```

`NavTreeNode.NavTreeItemGraphNode` — check `types/NavTreeNode.ts`; if it is a structural alias of `AppGraphNode.Node` the return type is assignable, otherwise return `TreeModel<AppGraphNode.Node>` and fix the two callers (`NavTreeContainer.tsx`, `L1Panel.tsx`) to that type. Remove `filterItems` from `util.ts` only if nothing else imports it (`NavTreeContainer.tsx` does — keep it).

- [ ] **Step 6: Typecheck and run the navtree stories**

Run: `npx tsc --noEmit -p packages/plugins/plugin-navtree/tsconfig.json && npx tsc --noEmit -p packages/plugins/plugin-graph/tsconfig.json && pnpm --filter @dxos/plugin-navtree exec vitest run --project=storybook`
Expected: clean; storybook project passes (same count as before the change — run it once before editing to record the baseline).

- [ ] **Step 7: Commit**

```bash
pnpm oxfmt packages/plugins/plugin-graph packages/plugins/plugin-navtree/src/hooks
git add -A && git commit -m "plugin-graph: createGraphTreeModel, the graph half of the navtree model; navtree wraps it"
```

---

### Task 4: DebugPanel — sidebar tree, main article, panel-local state

**Files:**

- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanel/view-state.ts`
- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx`
- Create: `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx`
- Create: `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelMain.tsx`
- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanel/index.ts`
- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanelStatus/DebugPanelStatus.tsx`
- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx`
- Modify: `packages/plugins/plugin-debug/src/translations.ts` (add `'debug-panel.empty.label': 'Select a tool'`, `'debug-panel.tree.label': 'Debug tools'`)
- Modify: `packages/plugins/plugin-debug/package.json` (+ `@dxos/plugin-graph` `workspace:*`; `@dxos/react-ui-list` is present), `tsconfig.json` reference

**Interfaces:**

- Consumes: `useGraphTreeModel` (Task 3), `DebugNodes.DEBUG_ROOT_ID` (Task 2), `Tree`/`Path`/`Empty` from `@dxos/react-ui-list`, `Splitter`/`Panel` from `@dxos/react-ui`, `useManagerOptional` from `@dxos/react-ui-attention`, `Surface.Surface` + `AppSurface.Article` + `AppSurface.ArticleData`.
- Produces: `DebugPanel = { Root, Sidebar, Main }`; `DebugPanelViewState = { nodeId?: string; open: string[]; position?; size? }`; `useDebugPanelContext()` exposing `{ contextId, nodeId, select(nodeId), toggle(pathKey, open) }`.

- [ ] **Step 1: View state**

```ts
export type DebugPanelViewState = {
  /** Qualified id of the selected page; absent until something is chosen. */
  readonly nodeId?: string;
  /** Joined paths (`Path.create`) of the expanded branches. */
  readonly open: readonly string[];
  readonly position?: Schema.Schema.Type<typeof Point>;
  readonly size?: Schema.Schema.Type<typeof Size>;
};

export const debugPanelAspect = ViewState.define<DebugPanelViewState>({
  key: 'debug-panel',
  backend: 'local',
  schema: Schema.Struct({
    nodeId: Schema.optional(Schema.String),
    open: Schema.Array(Schema.String),
    position: Schema.optional(Point),
    size: Schema.optional(Size),
  }),
  defaultValue: () => ({ open: [] }),
});
```

Delete `DebugPanelTabs`/`DebugPanelTab`. A persisted value of the old shape (`{ tab }`) fails schema decoding — check how `ViewState` handles a decode failure (it should fall back to the default; if it throws, bump the key to `'debug-panel.v2'`).

- [ ] **Step 2: `DebugPanel.tsx` — Root with context**

```tsx
type DebugPanelContextValue = {
  contextId: string;
  nodeId?: string;
  open: readonly string[];
  select: (nodeId: string) => void;
  setOpen: (pathKey: string, open: boolean) => void;
};

const [DebugPanelContextProvider, useDebugPanelContext] = createContext<DebugPanelContextValue>('DebugPanel');

const DebugPanelRoot = ({ contextId = DEBUG_PANEL_CONTEXT, children }: DebugPanelRootProps) => {
  const { nodeId, open } = useViewState(debugPanelAspect, contextId);
  const { update } = useViewStateActions(debugPanelAspect, contextId);
  const select = useCallback((nodeId: string) => update((prev) => ({ ...prev, nodeId })), [update]);
  const setOpen = useCallback(
    (pathKey: string, isOpen: boolean) =>
      update((prev) => ({
        ...prev,
        open: isOpen ? [...new Set([...prev.open, pathKey])] : prev.open.filter((key) => key !== pathKey),
      })),
    [update],
  );
  const value = useMemo(
    () => ({ contextId, nodeId, open, select, setOpen }),
    [contextId, nodeId, open, select, setOpen],
  );
  return <DebugPanelContextProvider {...value}>{children}</DebugPanelContextProvider>;
};
```

Use React's `createContext<DebugPanelContextValue | null>(null)` with a `useDebugPanelContext` that throws when the provider is missing (the same shape as `NavTreeContext`); `<DebugPanelContext.Provider value={value}>`. Export `DebugPanel = { Root, Sidebar, Main }` and `useDebugPanelContext`.

- [ ] **Step 3: `DebugPanelSidebar.tsx`**

```tsx
const ROOT_PATH = [DebugNodes.DEBUG_ROOT_ID];

export const DebugPanelSidebar = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, nodeId, open, select, setOpen } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const manager = useManagerOptional();
  // The model reads state through atoms; the manager's atom for this context is that state, and a
  // host without a ViewStateProvider (a bare story) gets an in-memory one.
  const stateAtom = useMemo(
    () => manager?.atom(debugPanelAspect, contextId) ?? Atom.make<DebugPanelViewState>({ open: [] }),
    [manager, contextId],
  );
  const state = useMemo(
    () => ({
      itemOpen: (path: string[]) =>
        Atom.make((get) => get(stateAtom).open.includes(Path.create(...path))).pipe(Atom.keepAlive),
      itemCurrent: (path: string[]) =>
        Atom.make((get) => get(stateAtom).nodeId === Path.last(Path.create(...path))).pipe(Atom.keepAlive),
    }),
    [stateAtom],
  );
  const model = useGraphTreeModel(DebugNodes.DEBUG_ROOT_ID, state);

  useEffect(() => {
    AppGraph.expandSync(graph, DebugNodes.DEBUG_ROOT_ID, 'child');
  }, [graph]);

  const handleOpenChange = useCallback(
    ({ item, path, open }: { item: AppGraphNode.Node; path: string[]; open: boolean }) => {
      setOpen(Path.create(...path), open);
      AppGraph.expandSync(graph, item.id, 'child');
    },
    [graph, setOpen],
  );

  const handleSelect = useCallback(
    ({ item, path }: { item: AppGraphNode.Node; path: string[] }) => {
      if (item.data === null) {
        // A branch has no page: selecting it toggles it.
        const key = Path.create(...path);
        setOpen(key, !open.includes(key));
        AppGraph.expandSync(graph, item.id, 'child');
        return;
      }
      select(item.id);
    },
    [graph, open, select, setOpen],
  );

  return (
    <ScrollArea.Root thin orientation='vertical'>
      <ScrollArea.Viewport>
        <Tree
          id={contextId}
          rootId={DebugNodes.DEBUG_ROOT_ID}
          path={ROOT_PATH}
          ariaLabel={t('debug-panel.tree.label')}
          model={model}
          density='sm'
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
        />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
```

Unused `nodeId` from the context can be dropped from the destructure. `Tree`'s default `renderColumns`/icon rendering is what the react-ui-list stories use — no custom columns.

- [ ] **Step 4: `DebugPanelMain.tsx`**

```tsx
/**
 * The selected page. Every page visited stays mounted (hidden) so the console and log viewer keep
 * their buffers while another tool is shown.
 */
export const DebugPanelMain = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, nodeId } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    if (nodeId && !visited.includes(nodeId)) {
      setVisited((prev) => [...prev, nodeId]);
    }
  }, [nodeId, visited]);

  if (!nodeId) {
    return <Empty label={t('debug-panel.empty.label')} />;
  }

  return (
    <>
      {visited.map((id) => (
        <DebugPanelPage key={id} graph={graph} contextId={contextId} nodeId={id} hidden={id !== nodeId} />
      ))}
    </>
  );
};

const DebugPanelPage = ({
  graph,
  contextId,
  nodeId,
  hidden,
}: {
  graph: AppGraph.ReadableGraph;
  contextId: string;
  nodeId: string;
  hidden: boolean;
}) => {
  const node = useNode(graph, nodeId);
  const data = useMemo<AppSurface.ArticleData | undefined>(
    () => node && { attendableId: `${contextId}/${nodeId}`, nodeId, subject: node.data, properties: node.properties },
    [node, contextId, nodeId],
  );
  if (!data) {
    return null;
  }
  return (
    <div role='none' className='dx-expand' hidden={hidden}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};
```

`useNode(graph, id)` is `@dxos/plugin-graph/hooks` and returns `AppGraphNode.Node | undefined`. If `dx-expand` on a `[hidden]` element does not hide (display grid overrides), use `classNames={mx('dx-expand', hidden && 'hidden')}`. Keep the `div` — it is the visibility toggle, not a layout wrapper. Verify that `Surface.Surface` in the storybook resolves the console article (Task 2's surfaces) — the story registers `DebugPlugin` surfaces via `withPluginManager({ plugins: [DebugPlugin.make()] })` or a minimal plugin contributing the same two surfaces.

- [ ] **Step 5: Recompose `DebugPanelStatus`**

Replace the body of `<FloatingPanel.Content>`:

```tsx
<DebugPanel.Root>
  <FloatingPanel.Header classNames='pl-1'>
    <FloatingPanel.DragTrigger>
      <FloatingPanel.Title>{t('debug-panel.title')}</FloatingPanel.Title>
    </FloatingPanel.DragTrigger>
    <FloatingPanel.Control>
      <FloatingPanel.StageTrigger stage='minimized' />
      <FloatingPanel.StageTrigger stage='default' />
      <FloatingPanel.CloseTrigger />
    </FloatingPanel.Control>
  </FloatingPanel.Header>
  <FloatingPanel.Body classNames='grid'>
    <Splitter.Root orientation='horizontal' anchor='start' resizable defaultSize={SIDEBAR_SIZE} minSize={8}>
      <Splitter.Panel position='start'>
        <DebugPanel.Sidebar />
      </Splitter.Panel>
      <Splitter.Handle />
      <Splitter.Panel position='end'>
        <DebugPanel.Main />
      </Splitter.Panel>
    </Splitter.Root>
  </FloatingPanel.Body>
</DebugPanel.Root>
```

`SIDEBAR_SIZE = 16` (rem, as `StoryboardArticle` passes `STACK_SIZE`). The title is no longer `sr-only` — the tab strip that stood in for it is gone. Delete `DebugPanelTablist` and the `DebugPanelContent` tabs; `DebugConsole`/`LoggerPanel` are reached through their article surfaces now.

- [ ] **Step 6: Story**

```tsx
const Render = (props: DebugPanelRootProps) => (
  <div className='h-[24rem] w-[64rem] max-w-full grid'>
    <DebugPanel.Root {...props}>
      <Splitter.Root orientation='horizontal' anchor='start' resizable defaultSize={16} minSize={8}>
        <Splitter.Panel position='start'>
          <DebugPanel.Sidebar />
        </Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel position='end'>
          <DebugPanel.Main />
        </Splitter.Panel>
      </Splitter.Root>
    </DebugPanel.Root>
  </div>
);
```

Decorators: `withPluginManager({ plugins: [...corePlugins(), DebugPlugin.make(), StubToolsPlugin()] })` where `StubToolsPlugin` (in `plugin-debug/src/testing/stub-tools-plugin.ts`) contributes one `AppGraphBuilder` extension matching `AppNodeMatcher.whenDebugGroup` with a branch `tools` (`data: null`) holding two pages whose data are literals, plus two article surfaces rendering `<div>{label}</div>` for them — so the story has a branch to toggle and a page to select without devtools. Add a `play` that clicks "Console" and asserts the console's textbox appears, then clicks the stub page and asserts its text.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p packages/plugins/plugin-debug/tsconfig.json && moon run plugin-debug:lint && pnpm --filter @dxos/plugin-debug exec vitest run --project=storybook src/containers/DebugPanel/DebugPanel.stories.tsx`
Then open the story on the 9009 storybook in the in-app browser: select Console → console renders; select Logs → console stays mounted (hidden), logs render; collapse/expand the stub branch; reload → selection and open state persist.

- [ ] **Step 8: Commit**

```bash
pnpm oxfmt packages/plugins/plugin-debug/src
git add -A && git commit -m "plugin-debug: DebugPanel is a navtree over root/debug beside the selected page"
```

---

### Task 5: Devtools and debug trees move under `root/debug`; bindings removed

**Files:**

- Modify: `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.test.ts`
- Modify: `packages/plugins/plugin-debug/src/capabilities/app-graph-builder.ts` (the `debug` extension)
- Modify: `packages/plugins/plugin-debug/src/capabilities/react-surface.ts`, `DebugSurfaces.tsx` (generator reads the active space)
- Modify: `packages/plugins/plugin-debug/src/types/DebugNodes.ts` (doc comment)

**Interfaces:**

- Consumes: `AppNodeMatcher.whenDebugGroup` (Task 1); `useActiveSpace` from `@dxos/app-toolkit/ui`.
- Produces: `createDevtoolsExtension(appGraphAtom)` matches only `whenDebugGroup`, declares no `url`; `DEVTOOLS_URL_KEY` deleted. plugin-debug's `debug` extension matches `whenDebugGroup`, its generator node `data: DebugNodes.SpaceType` (a literal, no space).

- [ ] **Step 1: Rewrite the devtools test**

Replace `setup()`'s stand-in extensions with a root extension producing the debug node, and drop the URL round-trip assertions:

```ts
const rootExtensions = await EffectEx.runPromise(
  AppGraphBuilder.createExtension({
    id: 'testRoot',
    match: GraphNodeMatcher.whenRoot,
    connector: () =>
      Effect.succeed([
        {
          id: GraphPath.GroupSegments.debug,
          type: GraphPath.GroupTypes.debug,
          data: null,
          properties: { disposition: 'hidden' },
        },
      ]),
  }),
);
const devtoolsExtensions = await EffectEx.runPromise(
  createDevtoolsExtension(Atom.make<AppCapabilities.AppGraph[]>([])),
);
const context = setupGraphBuilder({ extensions: [...rootExtensions, ...devtoolsExtensions] });
const debugRootId = `${GraphNode.RootId}/${GraphPath.GroupSegments.debug}`;
const devtoolsNodeId = GraphNode.qualifyId(debugRootId, Devtools.nodeId(Devtools.id));
await context.expand(GraphNode.RootId);
await context.expand(debugRootId);
await context.expand(devtoolsNodeId);
```

Tests:

```ts
test('the devtools tree hangs off the debug category', async ({ expect }) => {
  const { getConnections, devtoolsNodeId } = await setup();
  const ids = getConnections(devtoolsNodeId).map((node) => node.id);
  expect(ids).toContain(GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.AppGraph)));
  expect(ids).toContain(GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.Client.id)));
});

test('devtools pages have no URL representation', async ({ expect }) => {
  const { builder, devtoolsNodeId } = await setup();
  const pageId = GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.AppGraph));
  expect(Option.isNone(PathResolution.representNode(builder, pageId))).toBe(true);
});
```

The client/space setup (`TestBuilder`, `Client`) is no longer needed — remove it and its imports.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @dxos/plugin-devtools exec vitest run --project=node src/capabilities/app-graph-builder.test.ts`
Expected: FAIL — devtools still matches root/system, so the children are not under `root/debug/devtools` (or `DEVTOOLS_URL_KEY` import breaks first).

- [ ] **Step 3: Change the devtools extension**

In `createDevtoolsExtension`: delete the `url:` line and the `DEVTOOLS_URL_KEY` export and its comment; `match: AppNodeMatcher.whenDebugGroup`; connector signature `(_node, get) =>`; drop the `Space` type import and `GraphNodeMatcher.whenAny`/`whenRoot` for this extension (`whenRoot` stays for the `root` actions and `devtoolsOverview`). Remove the `position: Position.last` on the DevTools container if you want it after Console/Logs but before Debug — keep `Position.last` and give plugin-debug's container `Position.last` too; order between them is insertion order, which is fine.

- [ ] **Step 4: Change plugin-debug's `debug` extension and generator surface**

In `plugin-debug/src/capabilities/app-graph-builder.ts`:

```ts
AppGraphBuilder.createExtension({
  id: 'debug',
  match: AppNodeMatcher.whenDebugGroup,
  connector: () =>
    Effect.succeed([
      AppGraphNode.make({
        id: DebugNodes.nodeId(DebugNodes.id),
        data: null,
        type: DebugNodes.id,
        properties: { label: ['debug.label', { ns: meta.profile.key }], icon: 'ph--bug--regular', position: Position.last },
        nodes: [
          AppGraphNode.make({
            id: DebugNodes.nodeId(DebugNodes.SpaceType),
            type: DebugNodes.SpaceType,
            data: DebugNodes.SpaceType,
            properties: { label: ['generate-objects.label', { ns: meta.profile.key }], icon: 'ph--dice-five--regular' },
          }),
        ],
      }),
    ]),
}),
```

In `react-surface.ts` the `space` surface filter becomes `AppSurface.literal(AppSurface.Article, DebugNodes.SpaceType)` with `props: ({ role }) => ({ role })`; delete `isSpaceDebug`/`SpaceDebug`. In `DebugSurfaces.tsx`, `SpaceGeneratorSurface` drops its `space` prop and reads `const space = useActiveSpace();`, returning `null` (or `<Empty label={t('debug-panel.empty.label')} />`) when there is no active space. Update `DebugNodes.ts` comments ("sibling of DevTools under the SYSTEM navtree group" → "under the debug category").

- [ ] **Step 5: Run tests, typecheck, lint on both plugins**

Run: `pnpm --filter @dxos/plugin-devtools exec vitest run --project=node && pnpm --filter @dxos/plugin-debug exec vitest run --project=node src/capabilities && npx tsc --noEmit -p packages/plugins/plugin-debug/tsconfig.json && moon run plugin-devtools:lint plugin-debug:lint`
Expected: green (devtools tsc reports only the pre-existing missing `@dxos/devtools` dist types if that package is unbuilt — `moon run devtools:build` clears it; ignore only that signature).

- [ ] **Step 6: Commit**

```bash
pnpm oxfmt packages/plugins/plugin-devtools/src packages/plugins/plugin-debug/src
git add -A && git commit -m "plugin-devtools, plugin-debug: trees attach to root/debug; no URL bindings; generator reads the active space"
```

---

### Task 6: Verify in Composer, update PLUGIN.mdl and the ledger, PR

**Files:**

- Modify: `packages/plugins/plugin-debug/PLUGIN.mdl`, `packages/plugins/plugin-devtools/PLUGIN.mdl` (navtree/graph sections describe `root/debug` and the panel)
- Modify: `.agents/projects/plugin-debug/TASKS.md`, `.agents/projects/registry.yml` (`resume`)
- Modify: PR #13087 body (`gh pr edit`)

- [ ] **Step 1: Composer dev server**

`preview_start composer-app` (port 5180, this worktree), enable Devtools and Debug in the plugin registry, then:

1. Main navtree SYSTEM group shows only Database (no DevTools, no Debug).
2. Status bar → debug panel: sidebar lists Console, Logs, DevTools, Debug.
3. Console: type `1+1` → result; select Logs → table; back to Console → prior result still there.
4. DevTools → Client → Config renders the config JSON; Debug → Generate objects renders the generator and `+` on a type adds an object to the active space.
5. `window.location.pathname` unchanged throughout; console shows no `no URL binding` error for any debug node.
6. Reload: the panel reopens on the same page with the same branches open.
   Screenshot 2 and 4 to `temp/` for the PR body.

- [ ] **Step 2: Docs and ledger**

Update both `PLUGIN.mdl` files' graph/feature blocks to the as-built shape (hidden `root/debug`, console/logs nodes, panel sidebar + article, no URL bindings). Tick Phase 1 in `TASKS.md`; move "generator reads the active space" from Phase 2 to Phase 1 (done here); set the registry `resume`.

- [ ] **Step 3: Commit, push, PR body**

```bash
pnpm oxfmt packages/plugins/plugin-debug/PLUGIN.mdl packages/plugins/plugin-devtools/PLUGIN.mdl .agents/projects/plugin-debug/TASKS.md
git add -A && git commit -m "plugin-debug, plugin-devtools: PLUGIN.mdl for the debug panel tree; ledger" && git push origin HEAD
gh pr edit 13087 --title "plugin-debug: DebugPanel is a navtree over a hidden root/debug category" --body-file <body>
```

The body supersedes the interim "URL bindings" description: summary of §1–3 of the spec, the Composer test plan above, screenshots, and the Phase 2 follow-up.
