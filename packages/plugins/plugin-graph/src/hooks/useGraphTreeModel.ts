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
  { itemOpen, itemCurrent }: GraphTreeState,
): TreeModel<AppGraphNode.Node> => {
  const isVisibleChild = (node: AppGraphNode.Node) => !AppGraphNode.hasDisposition(node, 'hidden');

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
export const useGraphTreeModel = (rootId: string, options: GraphTreeState): TreeModel<AppGraphNode.Node> => {
  const { graph } = useAppGraph();
  const { itemOpen, itemCurrent } = options;
  return useMemo(
    () => createGraphTreeModel(graph, rootId, { itemOpen, itemCurrent }),
    [graph, rootId, itemOpen, itemCurrent],
  );
};
