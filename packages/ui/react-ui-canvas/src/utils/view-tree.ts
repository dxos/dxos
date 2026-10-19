//
// Copyright 2026 DXOS.org
//

import {
  type ElementId,
  type Link,
  type Node,
  type View,
  type ViewId,
  type ViewMap,
  isInstanceNode,
  isViewNode,
} from '../model/index.ts';
import { between, sortByZ } from './order.ts';

/** What a row of the views tree stands for (VIEWS.md §2). */
export type ViewTreeKind = 'view' | 'node' | 'link' | 'instance' | 'object';

/** One row of the views tree: a View, a node or link in one, an instance, or an object's contents under it. */
export type ViewTreeItem = {
  /** Unique in the tree: an object's contents are prefixed with the instance path, as one object shows under many. */
  id: string;
  kind: ViewTreeKind;
  /** The element (or, for a view, the frame node) this row is; undefined for the root view. */
  element?: ElementId;
  /** The View path the row belongs to, root first: what opening it, or selecting its element, navigates to. */
  path: ViewId[];
  /** The scene that holds the row's element, whose drawing order a restack changes; undefined for the root view. */
  container?: ViewId;
  label: string;
  /** The node or link type, for its icon. */
  type?: string;
  /** Read-only: an object's contents are edited by opening the object, not where it is placed. */
  readonly?: boolean;
  children: ViewTreeItem[];
};

/** A node's own text, whichever field its type keeps it in. */
const textOf = (element: Node | Link): string | undefined => {
  for (const field of ['label', 'name', 'text']) {
    const value: unknown = Reflect.get(element, field);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split('\n')[0];
    }
  }
  return undefined;
};

/**
 * The views tree under `root` (VIEWS.md §4, decision 3): each View's nodes in drawing order, then its links (a link
 * lives in its container, as its endpoints may change); a frame is the View it opens, with that View's contents as its
 * children; an instance shows its object's contents, read-only. A scene reached twice on one branch is not expanded
 * again, so a cycle cannot recurse.
 */
export const buildViewTree = (scenes: ViewMap, root: ViewId): ViewTreeItem => {
  const contents = (
    scene: View,
    path: ViewId[],
    prefix: string,
    readonly: boolean,
    seen: Set<ViewId>,
  ): ViewTreeItem[] => {
    const nodes = sortByZ(Object.values(scene.nodes)).map((node): ViewTreeItem => {
      const id = `${prefix}${node.id}`;
      if (isViewNode(node)) {
        const child = scenes[node.scene];
        const childPath = [...path, node.scene];
        return {
          id,
          kind: 'view',
          element: node.id,
          container: scene.id,
          path: childPath,
          label: textOf(node) ?? child?.name ?? 'View',
          type: node.type,
          readonly,
          children:
            child && !seen.has(child.id)
              ? contents(child, childPath, `${id}/`, readonly, new Set([...seen, child.id]))
              : [],
        };
      }
      if (isInstanceNode(node)) {
        const object = scenes[node.composite];
        return {
          id,
          kind: 'instance',
          element: node.id,
          container: scene.id,
          path,
          label: object?.name ?? node.composite,
          type: node.type,
          readonly,
          children:
            object && !seen.has(object.id) ? contents(object, path, `${id}/`, true, new Set([...seen, object.id])) : [],
        };
      }
      return {
        id,
        kind: 'node',
        element: node.id,
        container: scene.id,
        path,
        label: textOf(node) ?? node.type,
        type: node.type,
        readonly,
        children: [],
      };
    });
    const links = sortByZ(Object.values(scene.links)).map((link): ViewTreeItem => ({
      id: `${prefix}${link.id}`,
      kind: 'link',
      element: link.id,
      container: scene.id,
      path,
      label:
        textOf(link) ??
        `${'node' in link.source ? link.source.node : 'point'} → ${'node' in link.target ? link.target.node : 'point'}`,
      type: link.type,
      readonly,
      children: [],
    }));
    return [...nodes, ...links];
  };
  const scene = scenes[root];
  return {
    id: root,
    kind: 'view',
    path: [root],
    label: scene?.name ?? root,
    children: scene ? contents(scene, [root], '', false, new Set([root])) : [],
  };
};

/**
 * The `z` that moves `id` just before or after `target` in its scene's drawing order (nodes among nodes, links among
 * links), or undefined when the two are not siblings or the move changes nothing.
 */
export const restackZ = (
  scene: View,
  id: ElementId,
  target: ElementId,
  position: 'before' | 'after',
): string | undefined => {
  const elements: readonly { id: ElementId; z: string }[] = scene.nodes[id]
    ? Object.values(scene.nodes)
    : Object.values(scene.links);
  const group = sortByZ(elements.map(({ id, z }) => ({ id, z })));
  const at = group.findIndex((element) => element.id === id);
  const ordered = group.filter((element) => element.id !== id);
  const index = ordered.findIndex((element) => element.id === target);
  // Already there: the element sits just before (or after) the target.
  const placed = group[position === 'before' ? at + 1 : at - 1]?.id === target;
  if (at < 0 || index < 0 || id === target || placed) {
    return undefined;
  }
  const [low, high] =
    position === 'before' ? [ordered[index - 1], ordered[index]] : [ordered[index], ordered[index + 1]];
  return between(low?.z, high?.z);
};

/** The View path a row's element is drawn in: a View row's frame sits in its parent, every other row in its own. */
export const rowView = (item: ViewTreeItem): ViewId[] => (item.kind === 'view' ? item.path.slice(0, -1) : item.path);

/** Whether a row selects on the canvas: the root View has no element, and an object's contents are edited elsewhere. */
export const isSelectableRow = (item: ViewTreeItem): boolean =>
  !item.readonly && item.element !== undefined && item.path.length > 0;

const samePath = (left: readonly ViewId[] | undefined, right: readonly ViewId[]) =>
  left !== undefined && left.length === right.length && left.every((id, index) => id === right[index]);

/** A canvas selection a row activation asks for: the View to open, and what to select there. */
export type ViewRowSelection = { path: ViewId[]; ids: ElementId[] };

export type SelectRowsOptions = {
  item: ViewTreeItem;
  /** A shift-click's rows, anchor to `item`; only those drawn in `item`'s View are taken. */
  range?: readonly ViewTreeItem[];
  /** Meta held: toggle `item` (or add the range) within the selection, when it is in the open View. */
  meta?: boolean;
  /** The state a meta-click takes the row to. */
  current?: boolean;
  /** The canvas selection now. */
  selection: ReadonlySet<ElementId>;
  /** The open View's path; undefined in isolation, where no row's View is open. */
  path?: readonly ViewId[];
};

/**
 * What activating a row selects on the canvas: the row's element alone, toggled into the selection with meta, or a
 * range of rows in the same View; undefined for a row that selects nothing.
 */
export const selectRows = ({
  item,
  range,
  meta = false,
  current = true,
  selection,
  path,
}: SelectRowsOptions): ViewRowSelection | undefined => {
  if (!isSelectableRow(item) || item.element === undefined) {
    return undefined;
  }
  const view = rowView(item);
  const open = samePath(path, view);
  if (range) {
    const ids = range.flatMap((row) =>
      isSelectableRow(row) && row.element !== undefined && samePath(rowView(row), view) ? [row.element] : [],
    );
    return { path: view, ids: meta && open ? [...new Set([...selection, ...ids])] : ids };
  }
  if (meta && open) {
    const next = new Set(selection);
    current ? next.add(item.element) : next.delete(item.element);
    return { path: view, ids: [...next] };
  }
  return { path: view, ids: [item.element] };
};

/** A row dropped before or after a sibling: restack `element` in `container`'s drawing order. */
export type ViewReorder = {
  container: ViewId;
  element: ElementId;
  target: ElementId;
  position: 'before' | 'after';
};

/**
 * Whether `from` may be dropped beside `to`: siblings in the open View's container (another container is another View's
 * drawing, which the open View's projection cannot restack), nodes among nodes and links among links, and neither an
 * object's contents.
 */
export const canRestack = (from: ViewTreeItem, to: ViewTreeItem, view: ViewId | undefined): boolean =>
  !from.readonly &&
  !to.readonly &&
  from.element !== undefined &&
  to.element !== undefined &&
  from.container !== undefined &&
  from.container === view &&
  from.container === to.container &&
  (from.kind === 'link') === (to.kind === 'link');

/** The restack a drop above or below `to` asks for; undefined for any other drop. */
export const viewReorder = (from: ViewTreeItem, to: ViewTreeItem, instruction: string): ViewReorder | undefined =>
  from.container !== undefined &&
  from.element !== undefined &&
  to.element !== undefined &&
  (instruction === 'reorder-above' || instruction === 'reorder-below')
    ? {
        container: from.container,
        element: from.element,
        target: to.element,
        position: instruction === 'reorder-above' ? 'before' : 'after',
      }
    : undefined;
