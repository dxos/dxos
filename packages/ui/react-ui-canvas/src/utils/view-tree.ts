//
// Copyright 2026 DXOS.org
//

import {
  type ElementId,
  type Link,
  type Node,
  type Scene,
  type SceneId,
  type SceneMap,
  isFrameNode,
  isInstanceNode,
} from '../model/index.ts';
import { sortByZ } from './order.ts';

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
  path: SceneId[];
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
export const buildViewTree = (scenes: SceneMap, root: SceneId): ViewTreeItem => {
  const contents = (
    scene: Scene,
    path: SceneId[],
    prefix: string,
    readonly: boolean,
    seen: Set<SceneId>,
  ): ViewTreeItem[] => {
    const nodes = sortByZ(Object.values(scene.nodes)).map((node): ViewTreeItem => {
      const id = `${prefix}${node.id}`;
      if (isFrameNode(node)) {
        const child = scenes[node.scene];
        const childPath = [...path, node.scene];
        return {
          id,
          kind: 'view',
          element: node.id,
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
