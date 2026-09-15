//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { type DependencyList, useCallback, useContext, useEffect, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphNode from '@dxos/graph/GraphNode';
import { log } from '@dxos/log';

import {
  type AddMenuItemsProps,
  type MenuActions,
  type MenuActionsOptions,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemGroup,
  type MenuItems,
  type MenuItemsAccessor,
  type MenuItemsMap,
} from '../types.ts';

export type ActionGraphNodes = AppGraphNode.NodeArg<any>[];
export type ActionGraphEdges = AppGraph.Edge[];
export type ActionGraphProps = {
  nodes: ActionGraphNodes;
  edges: ActionGraphEdges;
};

const DEFAULT_PRIORITY = 100;

const EMPTY_GRAPH = Atom.make<ActionGraphProps>({ nodes: [], edges: [] }).pipe(Atom.keepAlive);

/** A `MenuActions` over a given accessor, for sources that are not an action graph (tests, fixtures). */
export const makeMenuActions = ({
  items,
  ...options
}: { items: MenuItemsAccessor } & MenuActionsOptions): MenuActions => ({
  items,
  contributions: Atom.make<MenuItemsMap>(new Map()).pipe(Atom.keepAlive),
  ...options,
});

/**
 * The menu over an action graph. Omit `props` for a menu with no items of its own, filled entirely by
 * contributions (a card whose actions its children register).
 */
export const useMenuActions = (
  props: Atom.Atom<ActionGraphProps> = EMPTY_GRAPH,
  options: MenuActionsOptions = {},
): MenuActions => {
  const registry = useContext(RegistryContext);
  const menuGraphProps = useAtomValue(props);

  // Create a new graph whenever props change to preserve correct order.
  // (AppGraph.addEdges appends rather than replaces, which breaks ordering on updates.)
  // NOTE: Using useMemo rather than a ref-mutation pattern to avoid calling registry.set during render,
  // which would trigger atom state updates in other components (setState-in-render React warning).
  const graph = useMemo(() => {
    const newGraph = AppGraph.make({ registry });
    AppGraph.addNodes(newGraph, menuGraphProps.nodes as AppGraphNode.NodeArg<any>[]);
    AppGraph.addEdges(newGraph, menuGraphProps.edges);
    return newGraph;
  }, [registry, menuGraphProps]);

  const items: MenuItemsAccessor = useCallback(
    (group?: MenuItemGroup) => {
      // TODO(wittjosiah): Migrate to using action relation instead of child.
      return graph.connections(group?.id || GraphNode.RootId, 'child') as Atom.Atom<MenuItem[] | null>;
    },
    [graph],
  );

  const contributions = useMemo(() => Atom.make<MenuItemsMap>(new Map()).pipe(Atom.keepAlive), []);

  const { onAction, caller, iconSize } = options;
  return useMemo(
    () => ({ items, contributions, onAction, caller, iconSize }),
    [items, contributions, onAction, caller, iconSize],
  );
};

/**
 * Convenience wrapper around `useMenuActions` that creates the backing atom inline.
 * Pass a builder thunk and a dependency list — the hook memoizes `Atom.make(build)` and threads
 * it through `useMenuActions`. Saves the `useMemo(() => Atom.make(...), deps)` boilerplate when
 * the action graph is composed from local state (e.g. a toolbar driven by component state).
 *
 * Read reactive state via `get` inside the builder; `deps` should hold only stable references.
 */
export const useMenuBuilder = (
  build: (get: Atom.AtomContext) => ActionGraphProps,
  deps: DependencyList,
  options?: MenuActionsOptions,
): MenuActions => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const atom = useMemo(() => Atom.make(build), deps);
  return useMenuActions(atom, options);
};

//
// Contributions
//

/**
 * Registers items with a menu another component owns, for as long as the caller is mounted. The
 * owner hands its `MenuActions` down (props or its own context); there is no menu provider.
 */
export const useMenuContribution = (menu: MenuActions | undefined, props: AddMenuItemsProps): void => {
  const registry = useContext(RegistryContext);
  const { id, mode, priority = DEFAULT_PRIORITY, items, groupFilter } = props;

  useEffect(() => {
    if (!menu) {
      return;
    }
    const update = (change: (previous: MenuItemsMap) => MenuItemsMap) =>
      registry.set(menu.contributions, change(registry.get(menu.contributions)));
    update((previous) => new Map(previous).set(id, { id, mode, priority, items, groupFilter }));
    return () =>
      update((previous) => {
        const next = new Map(previous);
        next.delete(id);
        return next;
      });
  }, [registry, menu, id, mode, priority, items, groupFilter]);
};

//
// Item resolution
//

const sortMenuItems = (items: MenuItems[]) =>
  [...items].sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.id.localeCompare(b.id)));

export const resolveItems = (
  baseItems: MenuItem[] | null,
  group: MenuGroupContext | undefined,
  entries: ReadonlyMap<string, MenuItems>,
): MenuItem[] | null => {
  const applicable = [...entries.values()].filter((entry) => !entry.groupFilter || entry.groupFilter(group));
  if (applicable.length === 0) {
    return baseItems;
  }

  const sorted = sortMenuItems(applicable);

  const replacements = sorted.filter((entry) => entry.mode === 'replacement');
  if (replacements.length > 0) {
    if (replacements.length > 1) {
      log.warn('multiple replacement entries found', {
        ids: replacements.map((r) => r.id).join(', '),
        using: replacements[0].id,
      });
    }
    return replacements[0].items;
  }

  const additive = sorted.filter((entry) => entry.mode === 'additive');
  const additiveItems = additive.flatMap((entry) => entry.items);

  if (!baseItems || baseItems.length === 0) {
    return additiveItems.length > 0 ? additiveItems : null;
  }

  return [...baseItems, ...additiveItems];
};

/**
 * A group's items (the root's when `group` is undefined), with the menu's contributions applied;
 * `propsItems` stands in for the group's own items when given.
 */
export const useMenuItems = (
  menu: MenuActions,
  group?: MenuGroupContext,
  propsItems?: MenuItem[],
): MenuItem[] | undefined => {
  const groupItems = useAtomValue(menu.items(group));
  const entries = useAtomValue(menu.contributions);
  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);
  const resolved = useMemo(() => resolveItems(baseItems, group, entries), [baseItems, group, entries]);
  return resolved ?? undefined;
};
