//
// Copyright 2026 DXOS.org
//

import {
  type ElementId,
  type Endpoint,
  type Link,
  type Node,
  type ViewId,
  isInstanceNode,
  isViewNode,
} from '@dxos/scene';

import { type RenderList2D, type RenderLists2D } from '../model/index.ts';
import { between, sortByZ } from './order.ts';

/** What a row of the views tree stands for (VIEWS.md §2). */
export type ViewTreeKind = 'view' | 'node' | 'link' | 'instance' | 'object';

/**
 * Where the canvas shows an element for editing: a View path from the root, or, for an Object's contents, the Object
 * opened in isolation (`isolate`) and the path within it, the Object first.
 */
export type ViewPlace = { path: ViewId[]; isolate?: ViewId };

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
  /** For an object's contents, where the element is drawn inside the (innermost) object, which is where it is edited. */
  object?: ViewPlace;
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

/** A node as its row names it: its own text, else the View or Object it shows, else its type. */
const nodeLabel = (scenes: RenderLists2D, node: Node): string =>
  textOf(node) ??
  (isViewNode(node) ? scenes[node.scene]?.name : isInstanceNode(node) ? scenes[node.composite]?.name : undefined) ??
  node.type;

/** A link end as its row names it, by its node's label; a free end is a point. */
const endLabel = (scenes: RenderLists2D, scene: RenderList2D, end: Endpoint): string => {
  if (!('node' in end)) {
    return 'point';
  }
  const node = scene.nodes[end.node];
  return node ? nodeLabel(scenes, node) : end.node;
};

/**
 * The views tree under `root` (VIEWS.md §4, decision 3): each View's nodes in drawing order, then its links (a link
 * lives in its container, as its endpoints may change); a frame is the View it opens, with that View's contents as its
 * children; an instance shows its object's contents, read-only. A scene reached twice on one branch is not expanded
 * again, so a cycle cannot recurse.
 */
export const buildViewTree = (scenes: RenderLists2D, root: ViewId): ViewTreeItem => {
  const contents = (
    scene: RenderList2D,
    path: ViewId[],
    prefix: string,
    object: ViewPlace | undefined,
    seen: Set<ViewId>,
  ): ViewTreeItem[] => {
    const readonly = object !== undefined;
    const inObject = object ? { readonly, object } : {};
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
          ...inObject,
          children:
            child && !seen.has(child.id)
              ? contents(
                  child,
                  childPath,
                  `${id}/`,
                  object && { ...object, path: [...object.path, node.scene] },
                  new Set([...seen, child.id]),
                )
              : [],
        };
      }
      if (isInstanceNode(node)) {
        const definition = scenes[node.composite];
        return {
          id,
          kind: 'instance',
          element: node.id,
          container: scene.id,
          path,
          label: definition?.name ?? node.composite,
          type: node.type,
          ...inObject,
          children:
            definition && !seen.has(definition.id)
              ? contents(
                  definition,
                  path,
                  `${id}/`,
                  { path: [definition.id], isolate: definition.id },
                  new Set([...seen, definition.id]),
                )
              : [],
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
        ...inObject,
        children: [],
      };
    });
    const links = sortByZ(Object.values(scene.links)).map((link): ViewTreeItem => ({
      id: `${prefix}${link.id}`,
      kind: 'link',
      element: link.id,
      container: scene.id,
      path,
      label: textOf(link) ?? `${endLabel(scenes, scene, link.source)} → ${endLabel(scenes, scene, link.target)}`,
      type: link.type,
      ...inObject,
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
    children: scene ? contents(scene, [root], '', undefined, new Set([root])) : [],
  };
};

/**
 * The `z` that moves `id` just before or after `target` in its scene's drawing order (nodes among nodes, links among
 * links), or undefined when the two are not siblings or the move changes nothing.
 */
export const restackZ = (
  scene: RenderList2D,
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

/** Where a row's element is selected: its View, or inside the Object it belongs to, opened in isolation. */
export const rowPlace = (item: ViewTreeItem): ViewPlace => item.object ?? { path: rowView(item) };

/** Whether a row stands for one element on the canvas; the root View stands for its whole contents instead. */
export const isSelectableRow = (item: ViewTreeItem): boolean => item.element !== undefined && item.path.length > 0;

const samePath = (left: readonly ViewId[] | undefined, right: readonly ViewId[]) =>
  left !== undefined && left.length === right.length && left.every((id, index) => id === right[index]);

/** Whether two places are the same View, isolated or not alike. */
export const samePlace = (left: ViewPlace | undefined, right: ViewPlace): boolean =>
  left !== undefined && left.isolate === right.isolate && samePath(left.path, right.path);

/** A canvas selection a row activation asks for: the place to open, and what to select there. */
export type ViewRowSelection = ViewPlace & { ids: ElementId[] };

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
  /** What the canvas shows now. */
  place?: ViewPlace;
};

/**
 * What activating a row selects on the canvas: the row's element alone, toggled into the selection with meta, or a
 * range of rows in the same place; the root View selects everything in it, like any View its contents.
 */
export const selectRows = ({
  item,
  range,
  meta = false,
  current = true,
  selection,
  place,
}: SelectRowsOptions): ViewRowSelection | undefined => {
  if (item.element === undefined) {
    const ids = item.children.flatMap((child) => (child.element === undefined ? [] : [child.element]));
    return { path: item.path, ids };
  }
  const target = rowPlace(item);
  const open = samePlace(place, target);
  if (range) {
    const ids = range.flatMap((row) =>
      isSelectableRow(row) && row.element !== undefined && samePlace(rowPlace(row), target) ? [row.element] : [],
    );
    return { ...target, ids: meta && open ? [...new Set([...selection, ...ids])] : ids };
  }
  if (meta && open) {
    const next = new Set(selection);
    current ? next.add(item.element) : next.delete(item.element);
    return { ...target, ids: [...next] };
  }
  return { ...target, ids: [item.element] };
};

/** A row dropped before or after a sibling: restack `element` in `container`'s drawing order. */
export type ViewReorder = {
  container: ViewId;
  element: ElementId;
  target: ElementId;
  position: 'before' | 'after';
};

/**
 * Whether `from` may be dropped beside `to`: siblings in one container (a View, or an Object's definition, which every
 * Instance then draws in the new order), nodes among nodes and links among links.
 */
export const canRestack = (from: ViewTreeItem, to: ViewTreeItem): boolean =>
  from.element !== undefined &&
  to.element !== undefined &&
  from.container !== undefined &&
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
