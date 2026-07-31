//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph, Node } from '@dxos/plugin-graph';
import { Path } from '@dxos/react-ui-list';

import { NavTreeCapabilities } from '#types';

import { navTreeOpenAspect } from './nav-tree-view-state';

/** Default `open` value for new entries; `current` is derived from the layout when the entry is created. */
const defaultOpen = false;

/** L0 (top-level workspace) paths are direct children of root — not part of the expandable tree model. */
const isTopLevelPath = (path: string[]): boolean => path.length === 2 && path[0] === Node.RootId;

/** Default state entries for initial tree structure. */
// TODO(thure): Initialize these dynamically.
const defaultStateEntries: [string, NavTreeCapabilities.NavTreeItemState][] = [
  ['root', { open: true, current: false }],
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    // Persistence backend for per-path expansion (`open`); replaces the hand-rolled localStorage blob.
    const viewState = yield* AttentionCapabilities.ViewState;

    // Mirror of the layout's active planks. An item registers its path only on its first render, which
    // can happen long after the layout change that made it current, so entries derive `current` from
    // this at creation time rather than waiting for the next layout notification.
    let activeIds: readonly string[] = registry.get(layoutAtom).active;

    /** Item state for a path not seen before: `current` follows the layout, `open` starts closed. */
    const initialItemState = (pathString: string): NavTreeCapabilities.NavTreeItemState => ({
      open: defaultOpen,
      current: activeIds.includes(Path.last(pathString)),
    });

    // Backing state (not reactive), seeded from the persisted `open` values; `current` is ephemeral.
    const persistedPaths = viewState.contexts(navTreeOpenAspect);
    const backingState: Map<string, NavTreeCapabilities.NavTreeItemState> =
      persistedPaths.length === 0
        ? new Map(defaultStateEntries)
        : new Map(
            persistedPaths.map((pathString) => [
              pathString,
              {
                open: viewState.get(navTreeOpenAspect, pathString).open,
                current: activeIds.includes(Path.last(pathString)),
              },
            ]),
          );

    // Per-path atom family for fine-grained reactivity.
    // keepAlive prevents atoms from being garbage collected when components unmount,
    // ensuring state is preserved across deletion/restoration cycles.
    const itemAtomFamily = Atom.family((pathString: string) =>
      Atom.make<NavTreeCapabilities.NavTreeItemState>(
        backingState.get(pathString) ?? initialItemState(pathString),
      ).pipe(Atom.keepAlive),
    );

    const getItemAtom = (path: string[]): Atom.Atom<NavTreeCapabilities.NavTreeItemState> => {
      const pathString = Path.create(...path);
      if (!backingState.has(pathString)) {
        backingState.set(pathString, initialItemState(pathString));
      }
      return itemAtomFamily(pathString);
    };

    const getItem = (path: string[]): NavTreeCapabilities.NavTreeItemState => {
      return registry.get(getItemAtom(path));
    };

    const setItem = (path: string[], key: 'open' | 'current', next: boolean) => {
      const pathString = Path.create(...path);
      const atom = itemAtomFamily(pathString);
      const currentValue = registry.get(atom);
      const newValue = { ...currentValue, [key]: next };

      registry.set(atom, newValue);
      // Track every touched path so the layout subscription can find it; only `open` is durable, and
      // top-level workspace paths are excluded (their expansion is not part of the tree model).
      backingState.set(pathString, newValue);
      if (key === 'open' && !isTopLevelPath(path)) {
        viewState.set(navTreeOpenAspect, pathString, { open: next });
      }
    };

    // Subscribe to layout changes to update current state.
    const unsubscribe = registry.subscribe(layoutAtom, (layout) => {
      const removed = activeIds.filter((id) => !layout.active.includes(id));
      activeIds = layout.active;

      const handleUpdate = () => {
        // Mark removed items as not current.
        removed.forEach((id) => {
          const keys = Array.from(backingState.keys()).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', false);
          });
        });

        // Mark active items as current.
        layout.active.forEach((id: string) => {
          const keys = Array.from(new Set([...backingState.keys(), id])).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', true);
          });
        });
      };

      // Deferred only far enough to leave the layout notification (writing item atoms synchronously here
      // would set state during the tree's render pass). Items whose path is not registered yet no longer
      // need waiting out — they seed `current` from `activeIds` when they register.
      queueMicrotask(handleUpdate);
    });

    // Once graph is ready, expand every node marked open in state so the graph has children loaded for rendering.
    yield* Effect.gen(function* () {
      const { graph } = yield* Capability.waitFor(AppCapabilities.AppGraph);

      // Always expand the active workspace so its subtree is initialized.
      const layout = registry.get(layoutAtom);
      if (layout.workspace) {
        Graph.expand(graph, layout.workspace, 'child');
      }

      // Expand persisted open nodes, skipping inactive workspace tabs.
      const openPaths = Array.from(backingState.entries())
        .filter(([, state]) => state.open)
        .map(([pathString]) => Path.parts(pathString))
        .filter((path) => !isTopLevelPath(path));
      for (const path of openPaths) {
        const nodeId = path[path.length - 1];
        if (!nodeId) {
          continue;
        }
        Graph.expand(graph, nodeId, 'child');
      }
    }).pipe(Effect.forkDaemon);

    return Capability.contribute(
      NavTreeCapabilities.State,
      {
        getItem,
        getItemAtom,
        setItem,
      },
      () => Effect.sync(() => unsubscribe()),
    );
  }),
);
