//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph, Node } from '@dxos/plugin-graph';
import { Path } from '@dxos/react-ui-list';

import { NavTreeCapabilities } from '#types';

import { navTreeOpenAspect } from './nav-tree-view-state';

/** Default item state for new entries. */
const defaultItemState: NavTreeCapabilities.NavTreeItemState = { open: false, current: false };

/** L0 (top-level workspace) paths are direct children of root — not part of the expandable tree model. */
const isTopLevelPath = (path: string[]): boolean => path.length === 2 && path[0] === Node.RootId;

/** Default state entries for initial tree structure. */
// TODO(thure): Initialize these dynamically.
const defaultStateEntries: [string, NavTreeCapabilities.NavTreeItemState][] = [
  ['root', { open: true, current: false }],
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const layoutAtom = yield* Capability.get(AppCapabilities.Layout);
    // Persistence backend for per-path expansion (`open`); replaces the hand-rolled localStorage blob.
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);

    // Backing state (not reactive), seeded from the persisted `open` values; `current` is ephemeral.
    const persistedPaths = viewState.contexts(navTreeOpenAspect);
    const backingState: Map<string, NavTreeCapabilities.NavTreeItemState> =
      persistedPaths.length === 0
        ? new Map(defaultStateEntries)
        : new Map(
            persistedPaths.map((pathString) => [
              pathString,
              { open: viewState.get(navTreeOpenAspect, pathString).open, current: false },
            ]),
          );

    // Per-path atom family for fine-grained reactivity.
    // keepAlive prevents atoms from being garbage collected when components unmount,
    // ensuring state is preserved across deletion/restoration cycles.
    const itemAtomFamily = Atom.family((pathString: string) =>
      Atom.make<NavTreeCapabilities.NavTreeItemState>(backingState.get(pathString) ?? { ...defaultItemState }).pipe(
        Atom.keepAlive,
      ),
    );

    const getItemAtom = (path: string[]): Atom.Atom<NavTreeCapabilities.NavTreeItemState> => {
      const pathString = Path.create(...path);
      if (!backingState.has(pathString)) {
        backingState.set(pathString, { ...defaultItemState });
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
    let previous: string[] = [];
    const unsubscribe = registry.subscribe(layoutAtom, (layout) => {
      const removed = previous.filter((id) => !layout.active.includes(id));
      previous = layout.active;

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

      // TODO(wittjosiah): This is setTimeout because there's a race between the keys being initialized.
      //   Keys are initialized on the first render of an item in the navtree.
      //   This could be avoided if the location was a path as well and not just an id.
      // Defer so item path atoms exist and we do not setState during tree render.
      const timeout = setTimeout(handleUpdate, 500);
      return () => clearTimeout(timeout);
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

    return Capability.contributes(
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
