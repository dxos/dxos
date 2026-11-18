//
// Copyright 2026 DXOS.org
//

import { type ContentMap, type Scene as DiagramScene, applyCommands } from '@dxos/diagram';
import { type Link, type Node, type Scene } from '@dxos/scene';

import { fromRenderLists2D } from '../viewport2d/index.ts';
import {
  type LinkRecord,
  type SceneRecord,
  clone,
  isLinkRecord,
  isNodeRecord,
  linkKey,
  nodeKey,
  putNodeRecord,
  readViews,
  rootOf,
  sceneKey,
  sceneRecordOf,
} from './content.ts';
import { SceneHandler, elementId } from './handler.ts';

export type DiagramSet = {
  /** The diagram opened first. */
  root: string;
  /** Each diagram's compiled scene commands (from its `.dx` source), by diagram id. */
  diagrams: Readonly<Record<string, readonly DiagramScene.Command[]>>;
  /** Each diagram's drawing name, by diagram id. */
  names: Readonly<Record<string, string>>;
  /** Per diagram, the boxes (by DSL node id) that open another diagram (by id) as a nested level. */
  drills: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

/** The element a semantic node (by DSL id) compiles to. */
export const boxId = (node: string) => elementId(node, 'box');

/**
 * Turns each drill-down box of `diagram` (in scene `scene` of `content`) into a frame onto a nested scene holding a copy
 * of the diagram it names, recursively, so zooming into a box drills into that diagram in place and zooming out comes
 * back. A copy rather than a link: a frame onto another drawing opens that drawing instead of drilling. The nested
 * scene's id prefixes its records' ids, so a diagram reached on two paths does not collide with itself.
 */
export const nestDrills = (
  content: ContentMap,
  set: DiagramSet,
  own: ReadonlyMap<string, ContentMap>,
  diagram: string,
  scene: string | undefined,
  visiting: ReadonlySet<string>,
) => {
  if (scene === undefined) {
    return;
  }
  const prefix = scene === rootOf(content) ? '' : `${scene}.`;
  for (const [box, target] of Object.entries(set.drills[diagram] ?? {})) {
    const key = nodeKey(`${prefix}${boxId(box)}`);
    const record = content[key];
    const child = own.get(target);
    const childRoot = child && rootOf(child);
    if (!isNodeRecord(record) || !child || !childRoot || visiting.has(target)) {
      continue;
    }
    const nested = `${prefix}${box}`;
    const header = sceneRecordOf(child, childRoot);
    content[sceneKey(nested)] = {
      kind: 'scene',
      id: nested,
      name: set.names[target] ?? target,
      ...(header?.layers ? { layers: clone(header.layers) } : {}),
    } satisfies SceneRecord;
    // The box becomes a frame in place, so its links stay attached.
    content[key] = { ...record, node: { ...record.node, type: 'view', scene: nested } };
    const rename = (id: string) => `${nested}.${id}`;
    // An end attached to a node follows the node's new id; a free end (a point) stays where it is.
    const renameEnd = (end: LinkRecord['link']['source']): LinkRecord['link']['source'] =>
      'node' in end ? { ...end, node: rename(end.node) } : end;
    for (const value of Object.values(child)) {
      const copy: unknown = value;
      if (isNodeRecord(copy) && copy.scene === childRoot) {
        putNodeRecord(content, nested, { ...clone(copy.node), id: rename(copy.node.id) });
      } else if (isLinkRecord(copy) && copy.scene === childRoot) {
        const link = clone(copy.link);
        content[linkKey(rename(link.id))] = {
          kind: 'link',
          scene: nested,
          link: {
            ...link,
            id: rename(link.id),
            source: renameEnd(link.source),
            target: renameEnd(link.target),
          },
        } satisfies LinkRecord;
      }
    }
    nestDrills(content, set, own, target, nested, new Set([...visiting, target]));
  }
};

export type DiagramSetDocumentOptions = {
  /** Rewrites a node of a diagram (a box drawn as the host's own type, say) before the diagrams are nested. */
  node?: (diagram: string, node: Node) => Node;
  /** Rewrites a link of a diagram (its text, say) before the diagrams are nested. */
  link?: (diagram: string, link: Link) => Link;
};

/**
 * The set as one 2D document held in memory: the root diagram's scene, with each drill-down box a frame onto a nested
 * copy of the diagram it names, as {@link nestDrills} makes them; nothing is stored.
 */
export const diagramSetDocument = (
  set: DiagramSet,
  { node, link }: DiagramSetDocumentOptions = {},
): Scene.SceneDocument => {
  const own = new Map<string, ContentMap>();
  for (const [id, commands] of Object.entries(set.diagrams)) {
    const content: ContentMap = {};
    applyCommands(content, [...commands], SceneHandler);
    for (const [key, record] of Object.entries(content)) {
      if (node && isNodeRecord(record)) {
        content[key] = { ...record, node: node(id, record.node) };
      } else if (link && isLinkRecord(record)) {
        content[key] = { ...record, link: link(id, record.link) };
      }
    }
    const root = rootOf(content);
    const header = root && sceneRecordOf(content, root);
    header && (content[sceneKey(root)] = { ...header, name: set.names[id] ?? id });
    own.set(id, content);
  }
  const root = own.get(set.root);
  if (!root) {
    throw new Error(`The diagram set has no root diagram: ${set.root}.`);
  }
  const content = clone(root);
  nestDrills(content, set, own, set.root, rootOf(content), new Set([set.root]));
  return fromRenderLists2D(Object.values(readViews(content)), { root: rootOf(content) });
};
