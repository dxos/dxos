//
// Copyright 2026 DXOS.org
//

//
// The canvas content encoding: `Drawing.Canvas.content` holds one record per scene, node and link
// (plus one `canvas` record naming the root), so ECHO merges concurrent edits element by element and
// the illustrator DSL bridge (`handler.ts`) can stamp its identity on the records it manages.
//

import * as Schema from 'effect/Schema';

import { type ContentMap } from '@dxos/diagram';
import { Link, Node, type Scene, type SceneId, type SceneMap } from '@dxos/react-ui-canvas/scene';

/**
 * DSL identity of a record the illustrator bridge manages; `ref` and `index` are the object's, `portal`
 * the drawing a portal element shows.
 */
export type DslIdentity = { object: string; element: string; ref?: string; index?: string; portal?: string };

export type CanvasRecord = { kind: 'canvas'; root: SceneId };
export type SceneRecord = { kind: 'scene'; id: SceneId; name?: string };
export type NodeRecord = { kind: 'node'; scene: SceneId; node: Node; dsl?: DslIdentity };
export type LinkRecord = { kind: 'link'; scene: SceneId; link: Link; dsl?: DslIdentity };
export type ElementRecord = NodeRecord | LinkRecord;

export const ROOT_SCENE_ID = 'scene:root';
const CANVAS_KEY = 'canvas';

export const sceneKey = (id: SceneId) => `scene:${id}`;
export const nodeKey = (id: string) => `node:${id}`;
export const linkKey = (id: string) => `link:${id}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const isCanvasRecord = (record: unknown): record is CanvasRecord =>
  isRecord(record) && record.kind === 'canvas' && typeof record.root === 'string';

export const isSceneRecord = (record: unknown): record is SceneRecord =>
  isRecord(record) && record.kind === 'scene' && typeof record.id === 'string';

export const isNodeRecord = (record: unknown): record is NodeRecord =>
  isRecord(record) && record.kind === 'node' && typeof record.scene === 'string' && Schema.is(Node)(record.node);

export const isLinkRecord = (record: unknown): record is LinkRecord =>
  isRecord(record) && record.kind === 'link' && typeof record.scene === 'string' && Schema.is(Link)(record.link);

export const isElementRecord = (record: unknown): record is ElementRecord =>
  isNodeRecord(record) || isLinkRecord(record);

/** Plain data from a record that may be an ECHO proxy: records must not alias live content. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Content with a root scene, written into an empty map when the first record is needed. */
export const seedContent = (content: ContentMap, root: SceneId = ROOT_SCENE_ID): SceneId => {
  const canvas = content[CANVAS_KEY];
  if (isCanvasRecord(canvas)) {
    if (!isSceneRecord(content[sceneKey(canvas.root)])) {
      content[sceneKey(canvas.root)] = { kind: 'scene', id: canvas.root } satisfies SceneRecord;
    }
    return canvas.root;
  }
  content[CANVAS_KEY] = { kind: 'canvas', root } satisfies CanvasRecord;
  content[sceneKey(root)] = { kind: 'scene', id: root } satisfies SceneRecord;
  return root;
};

/** The root scene id, when the content has been seeded. */
export const rootOf = (content: ContentMap): SceneId | undefined => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) ? canvas.root : undefined;
};

/** Scenes assembled from the records; nodes and links of an unknown scene are dropped. */
export const readScenes = (content: ContentMap): SceneMap => {
  const headers: Record<SceneId, SceneRecord> = {};
  const nodes: Record<SceneId, Record<string, Node>> = {};
  const links: Record<SceneId, Record<string, Link>> = {};
  for (const record of Object.values(content)) {
    if (isSceneRecord(record)) {
      headers[record.id] = record;
      nodes[record.id] = {};
      links[record.id] = {};
    }
  }
  for (const record of Object.values(content)) {
    if (isNodeRecord(record) && nodes[record.scene]) {
      nodes[record.scene][record.node.id] = clone(record.node);
    } else if (isLinkRecord(record) && links[record.scene]) {
      links[record.scene][record.link.id] = clone(record.link);
    }
  }
  const scenes: Record<SceneId, Scene> = {};
  for (const header of Object.values(headers)) {
    scenes[header.id] = { id: header.id, name: header.name, nodes: nodes[header.id], links: links[header.id] };
  }
  return scenes;
};

/**
 * Writes the scenes back as records, touching only what changed (compared as data) and keeping the
 * DSL identity of a record whose element the canvas edited. Scenes, nodes and links absent from
 * `scenes` are removed. Returns whether anything was written.
 */
export const writeScenes = (content: ContentMap, scenes: SceneMap): boolean => {
  let changed = false;
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

  for (const scene of Object.values(scenes)) {
    const key = sceneKey(scene.id);
    const record: SceneRecord = { kind: 'scene', id: scene.id, ...(scene.name ? { name: scene.name } : {}) };
    if (!same(content[key], record)) {
      content[key] = record;
      changed = true;
    }
    for (const node of Object.values(scene.nodes)) {
      const existing = content[nodeKey(node.id)];
      if (!isNodeRecord(existing) || existing.scene !== scene.id || !same(existing.node, node)) {
        const dsl = isNodeRecord(existing) ? existing.dsl : undefined;
        content[nodeKey(node.id)] = {
          kind: 'node',
          scene: scene.id,
          node: clone(node),
          ...(dsl ? { dsl: clone(dsl) } : {}),
        } satisfies NodeRecord;
        changed = true;
      }
    }
    for (const link of Object.values(scene.links)) {
      const existing = content[linkKey(link.id)];
      if (!isLinkRecord(existing) || existing.scene !== scene.id || !same(existing.link, link)) {
        const dsl = isLinkRecord(existing) ? existing.dsl : undefined;
        content[linkKey(link.id)] = {
          kind: 'link',
          scene: scene.id,
          link: clone(link),
          ...(dsl ? { dsl: clone(dsl) } : {}),
        } satisfies LinkRecord;
        changed = true;
      }
    }
  }

  for (const [key, record] of Object.entries(content)) {
    const stale =
      (isSceneRecord(record) && !scenes[record.id]) ||
      (isNodeRecord(record) && !scenes[record.scene]?.nodes[record.node.id]) ||
      (isLinkRecord(record) && !scenes[record.scene]?.links[record.link.id]);
    if (stale) {
      delete content[key];
      changed = true;
    }
  }
  return changed;
};
