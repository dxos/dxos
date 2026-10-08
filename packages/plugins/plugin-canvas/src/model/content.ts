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
import {
  LINE_STYLES,
  Link,
  type Node,
  NodeBase,
  type PortalNode,
  type Scene,
  type SceneId,
  type SceneMap,
  StyleClass,
  type StyleMap,
  isPortalNode,
} from '@dxos/react-ui-canvas/scene';

/**
 * DSL identity of a record the illustrator bridge manages; `ref` and `index` are the object's, `portal`
 * the drawing a portal element shows.
 */
export const DslIdentity = Schema.Struct({
  object: Schema.String,
  element: Schema.String,
  ref: Schema.optional(Schema.String),
  index: Schema.optional(Schema.String),
  portal: Schema.optional(Schema.String),
});
export type DslIdentity = Schema.Schema.Type<typeof DslIdentity>;

/** Names the root scene and holds the drawing's settings; one per canvas, under the key `canvas`. */
export const CanvasRecord = Schema.Struct({
  kind: Schema.Literal('canvas'),
  root: Schema.String,
  /** Shapes snap to the lattice's cells and links route along its gutters. */
  lattice: Schema.optional(Schema.Boolean),
  /** Minor grid spacing in scene px; the engine's default when unset. */
  grid: Schema.optional(Schema.Number),
});
export type CanvasRecord = Schema.Schema.Type<typeof CanvasRecord>;

/** One per scene, under `scene:<id>`; its nodes and links are records of their own that name it. */
export const SceneRecord = Schema.Struct({
  kind: Schema.Literal('scene'),
  id: Schema.String,
  name: Schema.optional(Schema.String),
});
export type SceneRecord = Schema.Schema.Type<typeof SceneRecord>;

/** One per node, under `node:<id>`; `node` is any node the engine handles, its type the registry's. */
export const NodeRecord = Schema.Struct({
  kind: Schema.Literal('node'),
  scene: Schema.String,
  node: NodeBase,
  dsl: Schema.optional(DslIdentity),
});
export type NodeRecord = Schema.Schema.Type<typeof NodeRecord>;

/** One per link, under `link:<id>`. */
export const LinkRecord = Schema.Struct({
  kind: Schema.Literal('link'),
  scene: Schema.String,
  link: Link,
  dsl: Schema.optional(DslIdentity),
});
export type LinkRecord = Schema.Schema.Type<typeof LinkRecord>;

/**
 * A value of `Drawing.Canvas.content` for this variant, discriminated by `kind`. The shared canvas schema
 * declares the map's values as `Any`, since every renderer encodes its own; this is the scene encoding.
 */
export const ContentRecord = Schema.Union([CanvasRecord, SceneRecord, NodeRecord, LinkRecord]);
export type ContentRecord = Schema.Schema.Type<typeof ContentRecord>;

export const ElementRecord = Schema.Union([NodeRecord, LinkRecord]);
export type ElementRecord = Schema.Schema.Type<typeof ElementRecord>;

export const ROOT_SCENE_ID = 'root';

/** The root id drawings were saved with before it lost the `scene:` its key already adds. */
const LEGACY_ROOT_SCENE_ID = 'scene:root';
const CANVAS_KEY = 'canvas';

export const sceneKey = (id: SceneId) => `scene:${id}`;
export const nodeKey = (id: string) => `node:${id}`;
export const linkKey = (id: string) => `link:${id}`;

export const isContentRecord = Schema.is(ContentRecord);
export const isCanvasRecord = Schema.is(CanvasRecord);
export const isSceneRecord = Schema.is(SceneRecord);
export const isNodeRecord = Schema.is(NodeRecord);
export const isLinkRecord = Schema.is(LinkRecord);
export const isElementRecord = Schema.is(ElementRecord);

/** Plain data from a record that may be an ECHO proxy: records must not alias live content. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const toRoot = (node: PortalNode): PortalNode => ({ ...node, scene: ROOT_SCENE_ID });

/** Whether the content was saved with the legacy root scene id, so `migrateContent` would change it. */
export const hasLegacyRoot = (content: ContentMap): boolean => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) && canvas.root === LEGACY_ROOT_SCENE_ID;
};

/**
 * Renames a legacy root scene (`scene:root`, stored under `scene:scene:root`) to `root` in place: its
 * record, the canvas record, and every element in it or showing it. Returns whether anything changed.
 */
export const migrateContent = (content: ContentMap): boolean => {
  if (!hasLegacyRoot(content)) {
    return false;
  }
  const legacy = content[sceneKey(LEGACY_ROOT_SCENE_ID)];
  delete content[sceneKey(LEGACY_ROOT_SCENE_ID)];
  content[sceneKey(ROOT_SCENE_ID)] = {
    kind: 'scene',
    id: ROOT_SCENE_ID,
    ...(isSceneRecord(legacy) && legacy.name !== undefined ? { name: legacy.name } : {}),
  } satisfies SceneRecord;
  const canvas = content[CANVAS_KEY];
  content[CANVAS_KEY] = {
    ...(isCanvasRecord(canvas) ? clone(canvas) : {}),
    kind: 'canvas',
    root: ROOT_SCENE_ID,
  } satisfies CanvasRecord;
  for (const [key, value] of Object.entries(content)) {
    const record: unknown = value;
    if (isNodeRecord(record)) {
      const node = clone(record.node);
      const portal = isPortalNode(node) && node.scene === LEGACY_ROOT_SCENE_ID;
      if (record.scene === LEGACY_ROOT_SCENE_ID || portal) {
        const next: Node = isPortalNode(node) && portal ? toRoot(node) : node;
        content[key] = {
          ...clone(record),
          scene: record.scene === LEGACY_ROOT_SCENE_ID ? ROOT_SCENE_ID : record.scene,
          node: next,
        } satisfies NodeRecord;
      }
    } else if (isLinkRecord(record) && record.scene === LEGACY_ROOT_SCENE_ID) {
      content[key] = { ...clone(record), scene: ROOT_SCENE_ID } satisfies LinkRecord;
    }
  }
  return true;
};

/** Content with a root scene, written into an empty map when the first record is needed. */
export const seedContent = (content: ContentMap, root: SceneId = ROOT_SCENE_ID): SceneId => {
  migrateContent(content);
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

/** The canvas record, when the content has been seeded. */
export const canvasRecordOf = (content: ContentMap): CanvasRecord | undefined => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) ? canvas : undefined;
};

/** Updates the canvas record's settings in place; the content must have been seeded. */
export const updateCanvasRecord = (content: ContentMap, values: Partial<Omit<CanvasRecord, 'kind' | 'root'>>) => {
  const canvas = canvasRecordOf(content);
  if (canvas) {
    // ECHO stores no `undefined`, so an unset value removes its key.
    const next: Record<string, unknown> = { ...clone(canvas), ...values };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined) {
        delete next[key];
      }
    }
    content[CANVAS_KEY] = next;
  }
};

/** The root scene id, when the content has been seeded. */
export const rootOf = (content: ContentMap): SceneId | undefined => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) ? canvas.root : undefined;
};

/**
 * A link saved with the retired `directed: true` reads as an arrow at its end; the next write stores it as
 * `ends`, since the record then differs from the link. Takes a fresh clone, which it edits in place.
 */
const withLegacyDirection = (link: Link): Link => {
  const legacy: unknown = Reflect.get(link, 'directed');
  if (legacy === undefined) {
    return link;
  }
  Reflect.deleteProperty(link, 'directed');
  return legacy === true && !link.ends ? { ...link, ends: { end: 'arrow' } } : link;
};

/** The drawing's style classes; a record that is not one (written by a newer host) is left out. */
export const readStyles = (styles: Record<string, unknown> | undefined): StyleMap => {
  const result: Record<string, StyleClass> = {};
  for (const [id, record] of Object.entries(clone(styles ?? {}))) {
    if (Schema.is(StyleClass)(record)) {
      result[id] = record;
    }
  }
  return result;
};

/** Writes `styles` over the canvas's classes record by record, so ECHO merges concurrent edits per class. */
export const writeStyles = (target: Record<string, unknown>, styles: StyleMap): void => {
  for (const id of Object.keys(target)) {
    if (!(id in styles)) {
      delete target[id];
    }
  }
  for (const [id, styleClass] of Object.entries(styles)) {
    if (JSON.stringify(target[id]) !== JSON.stringify(styleClass)) {
      target[id] = clone(styleClass);
    }
  }
};

/** The style class a node or link record names. */
const elementClass = (record: unknown): string | undefined => {
  if (isNodeRecord(record)) {
    return record.node.class;
  }
  return isLinkRecord(record) ? record.link.class : undefined;
};

/** How many nodes and links name each style class. */
export const styleClassUses = (content: ContentMap): Record<string, number> => {
  const uses: Record<string, number> = {};
  for (const record of Object.values(content)) {
    const id = elementClass(record);
    if (id) {
      uses[id] = (uses[id] ?? 0) + 1;
    }
  }
  return uses;
};

/**
 * Removes a style class, in place. The elements that took it keep its look as their own (under anything they set
 * themselves), so deleting a class changes how nothing looks, only what restyles together.
 */
export const deleteStyleClass = (content: ContentMap, styles: Record<string, unknown>, id: string): void => {
  const [styleClass] = Object.values(readStyles({ [id]: styles[id] }));
  delete styles[id];
  for (const [key, record] of Object.entries(content)) {
    if (isNodeRecord(record) && record.node.class === id) {
      const { class: _, ...node } = record.node;
      const style = { ...styleClass?.style, ...node.style };
      content[key] = { ...record, node: { ...node, ...(Object.keys(style).length > 0 ? { style } : {}) } };
    } else if (isLinkRecord(record) && record.link.class === id) {
      const { class: _, ...link } = record.link;
      // A link keeps the common base of the class's style, all it ever drew.
      const base = styleClass?.style;
      const style = {
        ...(base?.hue ? { hue: base.hue } : {}),
        ...(base?.lineStyle ? { lineStyle: base.lineStyle } : {}),
        ...link.style,
      };
      content[key] = { ...record, link: { ...link, ...(Object.keys(style).length > 0 ? { style } : {}) } };
    }
  }
};

/**
 * A link saved with the retired `line` (`{ hue, dash }`) reads as its `style`; the next write stores it so. Takes a
 * fresh clone, which it edits in place.
 */
const withLegacyLine = (link: Link): Link => {
  const legacy: unknown = Reflect.get(link, 'line');
  if (legacy === undefined) {
    return link;
  }
  Reflect.deleteProperty(link, 'line');
  if (typeof legacy !== 'object' || legacy === null || link.style) {
    return link;
  }
  const hue: unknown = Reflect.get(legacy, 'hue');
  const dash: unknown = Reflect.get(legacy, 'dash');
  const lineStyle = LINE_STYLES.find((candidate) => candidate === dash);
  const style = { ...(typeof hue === 'string' ? { hue } : {}), ...(lineStyle ? { lineStyle } : {}) };
  return Object.keys(style).length > 0 ? { ...link, style } : link;
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
      links[record.scene][record.link.id] = withLegacyLine(withLegacyDirection(clone(record.link)));
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
