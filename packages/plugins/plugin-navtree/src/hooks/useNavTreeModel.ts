//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { type Node } from '@dxos/plugin-graph';
import { Path, type TreeModel } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { type NavTreeItemGraphNode } from '#types';
import { filterItems } from '../util';

import { useNavTreeState } from './useNavTreeState';

// TODO(wittjosiah): Move companion/hidden nodes to their own edge categories so this filter is unnecessary.
const isVisibleChild = (node: Node.Node): boolean =>
  node.type !== PLANK_COMPANION_TYPE && node.properties.disposition !== 'hidden';

/** Create an atom family for item display props keyed by path. */
const createItemPropsFamily = (graph: ReturnType<typeof useAppGraph>['graph']) =>
  Atom.family((pathKey: string) => {
    const path = Path.parts(pathKey);
    const id = Path.last(pathKey);
    return Atom.make((get) => {
      const nodeOpt = get(graph.node(id));
      const node = Option.getOrElse(nodeOpt, () => undefined);
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
      const parentNode = parentId ? Option.getOrElse(get(graph.node(parentId)), () => undefined) : undefined;
      const droppable =
        node.properties.droppable === false || parentNode?.properties.childrenDroppable === false ? false : undefined;

      return {
        id: node.id,
        parentOf,
        disabled: node.properties.disabled,
        draggable: node.properties.draggable,
        droppable,
        label: node.properties.label ?? node.id,
        className: mx(node.properties.className, node.properties.modified && 'italic'),
        headingClassName: node.properties.headingClassName,
        icon: node.properties.icon,
        iconHue: node.properties.iconHue,
        testId: node.properties.testId,
      };
    }).pipe(Atom.keepAlive);
  });

/** Create an atom family for outbound child IDs keyed by parent ID (pre-sorted by position on write). */
const createChildIdsFamily = (graph: ReturnType<typeof useAppGraph>['graph']) =>
  Atom.family((id: string) =>
    Atom.make((get) => get(graph.connections(id, 'child')).map((child) => child.id)).pipe(Atom.keepAlive),
  );

/** Create an atom family for item resolution keyed by ID. */
const createItemFamily = (graph: ReturnType<typeof useAppGraph>['graph']) =>
  Atom.family((id: string) =>
    Atom.make((get) => {
      const node = Option.getOrElse(get(graph.node(id)), () => undefined);
      return node && filterItems(node) ? node : undefined;
    }).pipe(Atom.keepAlive),
  );

/** Create an atom family for open state keyed by path. */
const createItemOpenFamily = (getItemAtom: ReturnType<typeof useNavTreeState>['getItemAtom']) =>
  Atom.family((pathKey: string) => {
    const path = Path.parts(pathKey);
    const stateAtom = getItemAtom(path);
    return Atom.make((get) => get(stateAtom).open).pipe(Atom.keepAlive);
  });

/** Create an atom family for current (selected) state keyed by path. */
const createItemCurrentFamily = (getItemAtom: ReturnType<typeof useNavTreeState>['getItemAtom']) =>
  Atom.family((pathKey: string) => {
    const path = Path.parts(pathKey);
    const stateAtom = getItemAtom(path);
    return Atom.make((get) => get(stateAtom).current).pipe(Atom.keepAlive);
  });

/**
 * Creates a TreeModel backed by the app graph and navtree state.
 */
export const useNavTreeModel = (rootId: string): TreeModel<NavTreeItemGraphNode> => {
  const { graph } = useAppGraph();
  const { getItemAtom } = useNavTreeState();

  const itemPropsFamily = useMemo(() => createItemPropsFamily(graph), [graph]);
  const childIdsFamily = useMemo(() => createChildIdsFamily(graph), [graph]);
  const itemFamily = useMemo(() => createItemFamily(graph), [graph]);
  const itemOpenFamily = useMemo(() => createItemOpenFamily(getItemAtom), [getItemAtom]);
  const itemCurrentFamily = useMemo(() => createItemCurrentFamily(getItemAtom), [getItemAtom]);

  return useMemo(
    () => ({
      item: (id: string) => itemFamily(id),
      itemProps: (path: string[]) => itemPropsFamily(Path.create(...path)),
      itemOpen: (path: string[]) => itemOpenFamily(Path.create(...path)),
      itemCurrent: (path: string[]) => itemCurrentFamily(Path.create(...path)),
      childIds: (parentId?: string) => childIdsFamily(parentId ?? rootId),
    }),
    [itemFamily, itemPropsFamily, itemOpenFamily, itemCurrentFamily, childIdsFamily, rootId],
  );
};
