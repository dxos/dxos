//
// Copyright 2026 DXOS.org
//

//
// The canvas content records: one per scene, node and link (plus one `canvas` record naming the root). The illustrator
// DSL bridge (`handler.ts`) reads and edits a drawing through them, stamping its identity on the records it manages.
//

import * as Schema from 'effect/Schema';

import { type ContentMap } from '@dxos/diagram';
import {
  DASHES,
  Layer,
  Link,
  LINK_KIND,
  type Node,
  NodeBase,
  Scene,
  StyleClass,
  type StyleMap,
  type ViewId,
  type ViewNode,
  isViewNode,
  upgradeLink,
  upgradeNode,
  upgradeStyleClass,
  withLegacyNodeKind,
  withLegacyParams,
} from '@dxos/scene';

import { type RenderList2D, type RenderLists2D, orphanViews } from '../model/index.ts';
import { DEFAULT_LAYER, elementLayer, sortByZ } from '../utils/index.ts';
import { CanvasSettings } from './canvas-settings.ts';

/**
 * DSL identity of a record the illustrator bridge manages; `ref` and `index` are the object's, `portal`
 * the drawing a portal element shows.
 */

/** Names the root scene and holds the drawing's settings; one per canvas, under the key `canvas`. */
export const CanvasRecord = Schema.Struct({
  kind: Schema.Literal('canvas'),
  root: Schema.String,
  ...CanvasSettings.fields,
});
export type CanvasRecord = Schema.Schema.Type<typeof CanvasRecord>;

/** One per scene, under `scene:<id>`; its nodes and links are records of their own that name it. */
export const SceneRecord = Schema.Struct({
  kind: Schema.Literal('scene'),
  id: Schema.String,
  name: Schema.optional(Schema.String),
  /** The scene's layers, kept with it since they are few and change together. */
  layers: Schema.optional(Schema.Record(Schema.String, Layer)),
  /** A composite object's definition rather than a plain scene (`Scene.kind`; `kind` here names the record). */
  sceneKind: Schema.optional(Scene.LayoutKind),
  /** An Object the Group command made, kept out of the library until it is named or placed again (`RenderList2D.anonymous`). */
  anonymous: Schema.optional(Schema.Boolean),
});
export type SceneRecord = Schema.Schema.Type<typeof SceneRecord>;

/** One per node, under `node:<id>`; `node` is any node the engine handles, its kind the registry's. */
export const NodeRecord = Schema.Struct({
  kind: Schema.Literal('node'),
  scene: Schema.String,
  node: NodeBase,
  dsl: Schema.optional(Scene.DslIdentity),
});
export type NodeRecord = Schema.Schema.Type<typeof NodeRecord>;

/** One per link, under `link:<id>`. */
export const LinkRecord = Schema.Struct({
  kind: Schema.Literal('link'),
  scene: Schema.String,
  link: Link,
  dsl: Schema.optional(Scene.DslIdentity),
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

export const ROOT_VIEW_ID = 'root';

/** The root id drawings were saved with before it lost the `scene:` its key already adds. */
export const LEGACY_ROOT_VIEW_ID = 'scene:root';
const CANVAS_KEY = 'canvas';

export const sceneKey = (id: ViewId) => `scene:${id}`;
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

const toRoot = (node: ViewNode): ViewNode => ({ ...node, scene: ROOT_VIEW_ID });

/** Whether the content was saved with the legacy root scene id, so `migrateContent` would change it. */
export const hasLegacyRoot = (content: ContentMap): boolean => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) && canvas.root === LEGACY_ROOT_VIEW_ID;
};

/**
 * Renames a legacy root scene (`scene:root`, stored under `scene:scene:root`) to `root` in place: its
 * record, the canvas record, and every element in it or showing it. Returns whether anything changed.
 */
export const migrateContent = (content: ContentMap): boolean => {
  if (!hasLegacyRoot(content)) {
    return false;
  }
  const legacy = content[sceneKey(LEGACY_ROOT_VIEW_ID)];
  delete content[sceneKey(LEGACY_ROOT_VIEW_ID)];
  content[sceneKey(ROOT_VIEW_ID)] = {
    kind: 'scene',
    id: ROOT_VIEW_ID,
    ...(isSceneRecord(legacy) && legacy.name !== undefined ? { name: legacy.name } : {}),
  } satisfies SceneRecord;
  const canvas = content[CANVAS_KEY];
  content[CANVAS_KEY] = {
    ...(isCanvasRecord(canvas) ? clone(canvas) : {}),
    kind: 'canvas',
    root: ROOT_VIEW_ID,
  } satisfies CanvasRecord;
  for (const [key, value] of Object.entries(content)) {
    const record = readElementRecord(value);
    if (record?.kind === 'node') {
      const { node } = record;
      const portal = isViewNode(node) && node.scene === LEGACY_ROOT_VIEW_ID;
      if (record.scene === LEGACY_ROOT_VIEW_ID || portal) {
        const next: Node = isViewNode(node) && portal ? toRoot(node) : node;
        content[key] = {
          ...record,
          scene: record.scene === LEGACY_ROOT_VIEW_ID ? ROOT_VIEW_ID : record.scene,
          node: next,
        } satisfies NodeRecord;
      }
    } else if (record?.kind === 'link' && record.scene === LEGACY_ROOT_VIEW_ID) {
      content[key] = { ...record, scene: ROOT_VIEW_ID } satisfies LinkRecord;
    }
  }
  return true;
};

/** Each scene's layers, bottom first, as the engine reads them: a scene record naming none has the default one. */
const layersByScene = (content: ContentMap): Map<ViewId, Layer[]> => {
  const layers = new Map<ViewId, Layer[]>();
  for (const value of Object.values(content)) {
    const record: unknown = value;
    if (isSceneRecord(record)) {
      const named = sortByZ(Object.values(record.layers ?? {}));
      layers.set(record.id, named.length > 0 ? named : [DEFAULT_LAYER]);
    }
  }
  return layers;
};

/** The element record's element with its layer named: the one it is drawn on (`elementLayer`). Takes a fresh clone. */
const placed = (record: ElementRecord, layers: readonly Layer[]): ElementRecord | undefined => {
  const element = record.kind === 'node' ? record.node : record.link;
  const layer = elementLayer(element, layers);
  if (element.layer === layer) {
    return undefined;
  }
  return record.kind === 'node'
    ? { ...record, node: { ...record.node, layer } }
    : { ...record, link: { ...record.link, layer } };
};

/**
 * Whether the content was saved before layers, or has an element on a layer its scene does not have, so
 * `migrateLayers` would change it.
 */
export const hasUnplacedLayers = (content: ContentMap): boolean => {
  const layers = layersByScene(content);
  return Object.values(content).some((value) => {
    const record: unknown = value;
    if (isSceneRecord(record)) {
      return Object.keys(record.layers ?? {}).length === 0;
    }
    const element = readElementRecord(record);
    const scene = element && layers.get(element.scene);
    return element !== undefined && scene !== undefined && placed(element, scene) !== undefined;
  });
};

/**
 * Names every scene's layers and every element's layer in place, so what the panels show is what is stored: a scene
 * with none gets the default layer, and an element with none (or one its scene lacks) the layer it is drawn on, the
 * bottom one. Without it an element naming no layer follows whichever layer is at the bottom, so adding a layer there
 * would take it. Returns whether anything changed.
 */
export const migrateLayers = (content: ContentMap): boolean => {
  if (!hasUnplacedLayers(content)) {
    return false;
  }
  const layers = layersByScene(content);
  for (const [key, value] of Object.entries(content)) {
    const record: unknown = value;
    if (isSceneRecord(record) && Object.keys(record.layers ?? {}).length === 0) {
      content[key] = { ...clone(record), layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER } } satisfies SceneRecord;
    } else {
      const element = readElementRecord(record);
      const scene = element && layers.get(element.scene);
      const next = element && scene && placed(element, scene);
      if (next) {
        content[key] = next;
      }
    }
  }
  return true;
};

/**
 * The scenes nothing reaches from the root (VIEWS.md §7.4): Views no view node opens and anonymous Objects with no
 * Instance, which edits made before deleting the last of those nodes deleted the record left behind.
 */
export const orphanedViews = (content: ContentMap): ViewId[] => {
  const root = rootOf(content);
  return root === undefined ? [] : [...orphanViews(readViews(content), [root])];
};

/** Removes the scenes `orphanedViews` names, with their nodes and links, in place; returns whether it removed any. */
export const pruneOrphanedViews = (content: ContentMap): boolean => {
  const orphans = new Set(orphanedViews(content));
  if (orphans.size === 0) {
    return false;
  }
  for (const [key, value] of Object.entries(content)) {
    const record: unknown = value;
    const element = readElementRecord(record);
    if ((isSceneRecord(record) && orphans.has(record.id)) || (element && orphans.has(element.scene))) {
      delete content[key];
    }
  }
  return true;
};

/** Content with a root scene, written into an empty map when the first record is needed. */
export const seedContent = (content: ContentMap, root: ViewId = ROOT_VIEW_ID): ViewId => {
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

/** What a drawing passes the view to pick its look: its own theme over the user's, then its overrides of the parts. */
export type DrawingLook = Pick<CanvasRecord, 'theme' | 'styleSet' | 'background' | 'backgroundGrid'> & {
  defaultTheme?: string;
};

/**
 * The look a drawing draws with: its own theme (shared with collaborators) over the user's default, else classic, then
 * the drawing's overrides of the theme's style set, background and grid.
 */
export const resolveDrawingLook = (
  record: Pick<CanvasRecord, 'theme' | 'styleSet' | 'background' | 'backgroundGrid'> | undefined,
  defaults: { theme?: string },
): DrawingLook => ({
  theme: record?.theme,
  defaultTheme: defaults.theme,
  styleSet: record?.styleSet,
  background: record?.background,
  backgroundGrid: record?.backgroundGrid,
});

/** The root scene id, when the content has been seeded. */
export const rootOf = (content: ContentMap): ViewId | undefined => {
  const canvas = content[CANVAS_KEY];
  return isCanvasRecord(canvas) ? canvas.root : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A link saved with the retired `directed: true` reads as an arrow at its head, unless it names its own markers. */
const withLegacyDirection = (link: Record<string, unknown>): Record<string, unknown> => {
  const { directed, ...rest } = link;
  if (directed === undefined) {
    return link;
  }
  const marked = isRecord(rest.ends) || rest.tail !== undefined || rest.head !== undefined;
  return directed === true && !marked ? { ...rest, head: 'arrow' } : rest;
};

/** A link saved with the retired `line` (`{ hue, dash }`) reads as its own look, unless it has one already. */
const withLegacyLine = (link: Record<string, unknown>): Record<string, unknown> => {
  const { line, ...rest } = link;
  if (line === undefined) {
    return link;
  }
  if (!isRecord(line) || isRecord(rest.style) || isRecord(rest.overrides)) {
    return rest;
  }
  const stroke = DASHES.find((candidate) => candidate === line.dash);
  const overrides = { ...(typeof line.hue === 'string' ? { color: line.hue } : {}), ...(stroke ? { stroke } : {}) };
  return Object.keys(overrides).length > 0 ? { ...rest, overrides } : rest;
};

/**
 * A node saved before its opacity moved into its own look, or a frame saved before its `object`, `contents` and `role`
 * moved into its `link`, reads in the current shape. Takes a fresh clone, which it edits in place.
 */
const withLegacyNode = (node: Node): Node => {
  const opacity: unknown = Reflect.get(node, 'opacity');
  const object: unknown = Reflect.get(node, 'object');
  const contents: unknown = Reflect.get(node, 'contents');
  const role: unknown = Reflect.get(node, 'role');
  Reflect.deleteProperty(node, 'opacity');
  let overrides = node.overrides;
  if (typeof opacity === 'number' && overrides?.opacity === undefined) {
    overrides = { ...overrides, opacity };
  }
  // Only a frame ever carried `object`, `contents` and `role`; on another kind they are a host's own fields.
  const framed = isViewNode(node) && (object !== undefined || contents !== undefined || role !== undefined);
  if (!framed) {
    return overrides === node.overrides ? node : { ...node, overrides };
  }
  Reflect.deleteProperty(node, 'object');
  Reflect.deleteProperty(node, 'contents');
  Reflect.deleteProperty(node, 'role');
  const current: unknown = Reflect.get(node, 'link');
  const link = {
    ...(object !== undefined ? { object } : {}),
    ...(typeof role === 'string' ? { role } : {}),
    ...(typeof contents === 'boolean' ? { contents } : {}),
    ...(isRecord(current) ? current : {}),
  };
  return Object.assign({}, node, overrides ? { overrides } : {}, { link });
};

/** A stored node in the current shape (`readNode`). Takes a fresh clone, which it may edit in place. */
const currentNode = (stored: Record<string, unknown>): Node | undefined => {
  // A node stating its `kind` is in the current words, and is kept field for field so a write finds it unchanged.
  const node = typeof stored.kind === 'string' ? stored : upgradeNode(stored);
  return Schema.is(NodeBase)(node) ? withLegacyNode(withLegacyParams(withLegacyNodeKind(node))) : undefined;
};

/** A stored link in the current shape (`readLink`). Takes a fresh clone, which it may edit in place. */
const currentLink = (stored: Record<string, unknown>): Link | undefined => {
  // Every link of the current words states the one kind a link has, and is kept field for field as a node is.
  const link = stored.kind === LINK_KIND ? stored : upgradeLink(withLegacyLine(withLegacyDirection(stored)));
  return Schema.is(Link)(link) ? link : undefined;
};

/**
 * A stored node in the current shape, whatever revision wrote it: the earlier words (`type`,
 * `class`, a hue and a tone), its legacy kind name (`frame`), settings beside the shared fields, opacity and frame
 * fields moved. Nothing where the value is not a node. Returns a fresh clone.
 */
export const readNode = (stored: unknown): Node | undefined =>
  isRecord(stored) ? currentNode(clone(stored)) : undefined;

/**
 * A stored link in the current shape, whatever revision wrote it: the earlier words (`type`,
 * `ends`, `text`, `class`) and the retired `directed` and `line` read as its path, markers, label and look. Nothing
 * where the value is not a link. Returns a fresh clone.
 */
export const readLink = (stored: unknown): Link | undefined =>
  isRecord(stored) ? currentLink(clone(stored)) : undefined;

/** A stored node record with its node in the current shape (`readNode`); nothing where the value is not one. */
export const readNodeRecord = (value: unknown): NodeRecord | undefined => {
  if (!isRecord(value) || value.kind !== 'node') {
    return undefined;
  }
  const { node: stored, ...rest } = clone(value);
  const node = isRecord(stored) ? currentNode(stored) : undefined;
  const record = node && { ...rest, node };
  return isNodeRecord(record) ? record : undefined;
};

/** A stored link record with its link in the current shape (`readLink`); nothing where the value is not one. */
export const readLinkRecord = (value: unknown): LinkRecord | undefined => {
  if (!isRecord(value) || value.kind !== 'link') {
    return undefined;
  }
  const { link: stored, ...rest } = clone(value);
  const link = isRecord(stored) ? currentLink(stored) : undefined;
  const record = link && { ...rest, link };
  return isLinkRecord(record) ? record : undefined;
};

/** A stored node or link record in the current shape; nothing where the value is neither. */
export const readElementRecord = (value: unknown): ElementRecord | undefined =>
  readNodeRecord(value) ?? readLinkRecord(value);

/** A stored style class in the current words; nothing where the value is not one (written by a newer host). */
const readStyleClass = (stored: unknown): StyleClass | undefined => {
  const styleClass = isRecord(stored) ? upgradeStyleClass(clone(stored)) : undefined;
  return Schema.is(StyleClass)(styleClass) ? styleClass : undefined;
};

/** The drawing's style classes; a record that is not one (written by a newer host) is left out. */
export const readStyles = (styles: Record<string, unknown> | undefined): StyleMap => {
  const result: Record<string, StyleClass> = {};
  for (const [id, stored] of Object.entries(styles ?? {})) {
    const styleClass = readStyleClass(stored);
    if (styleClass) {
      result[id] = styleClass;
    }
  }
  return result;
};

/**
 * Writes `styles` over the canvas's classes record by record, so ECHO merges concurrent edits per class. A record
 * `readStyles` left out (written by a newer host) is kept, since this host never saw it to delete it.
 */
export const writeStyles = (target: Record<string, unknown>, styles: StyleMap): void => {
  for (const id of Object.keys(target)) {
    if (!(id in styles) && readStyleClass(target[id])) {
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
const elementClass = (record: ElementRecord | undefined): string | undefined =>
  record?.kind === 'node' ? record.node.style : record?.link.style;

/** How many nodes and links name each style class. */
export const styleClassUses = (content: ContentMap): Record<string, number> => {
  const uses: Record<string, number> = {};
  for (const record of Object.values(content)) {
    const id = elementClass(readElementRecord(record));
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
  const styleClass = readStyleClass(styles[id]);
  delete styles[id];
  for (const [key, value] of Object.entries(content)) {
    const record = readElementRecord(value);
    if (record?.kind === 'node' && record.node.style === id) {
      const { style: _, ...node } = record.node;
      const overrides = { ...styleClass?.style, ...node.overrides };
      content[key] = { ...record, node: { ...node, ...(Object.keys(overrides).length > 0 ? { overrides } : {}) } };
    } else if (record?.kind === 'link' && record.link.style === id) {
      const { style: _, ...link } = record.link;
      // A link keeps the common base of the class's style, all it ever drew.
      const base = styleClass?.style;
      const overrides = {
        ...(base?.color ? { color: base.color } : {}),
        ...(base?.stroke ? { stroke: base.stroke } : {}),
        ...link.overrides,
      };
      content[key] = { ...record, link: { ...link, ...(Object.keys(overrides).length > 0 ? { overrides } : {}) } };
    }
  }
};

/**
 * The content with every record in the current shape: the legacy root scene renamed (`migrateContent`) and each
 * node and link upgraded. Pure, so peers migrating one canvas write the same records; returns a new map.
 */
export const upgradeSceneContent = (content: ContentMap): ContentMap => {
  const next = clone(content);
  migrateContent(next);
  for (const [key, value] of Object.entries(next)) {
    const record = readElementRecord(value);
    if (record) {
      next[key] = record;
    }
  }
  return next;
};

/** Scenes assembled from the records; nodes and links of an unknown scene are dropped. */
export const readViews = (content: ContentMap): RenderLists2D => {
  const headers: Record<ViewId, SceneRecord> = {};
  const nodes: Record<ViewId, Record<string, Node>> = {};
  const links: Record<ViewId, Record<string, Link>> = {};
  for (const record of Object.values(content)) {
    if (isSceneRecord(record)) {
      headers[record.id] = record;
      nodes[record.id] = {};
      links[record.id] = {};
    }
  }
  for (const value of Object.values(content)) {
    const record = readElementRecord(value);
    if (record?.kind === 'node' && nodes[record.scene]) {
      nodes[record.scene][record.node.id] = record.node;
    } else if (record?.kind === 'link' && links[record.scene]) {
      links[record.scene][record.link.id] = record.link;
    }
  }
  const scenes: Record<ViewId, RenderList2D> = {};
  for (const header of Object.values(headers)) {
    scenes[header.id] = {
      id: header.id,
      name: header.name,
      nodes: nodes[header.id],
      links: links[header.id],
      ...(header.layers ? { layers: clone(header.layers) } : {}),
      ...(header.sceneKind ? { kind: header.sceneKind } : {}),
      ...(header.anonymous ? { anonymous: true } : {}),
    };
  }
  return scenes;
};

/**
 * Writes the scenes back as records, touching only what changed (compared as data) and keeping the
 * DSL identity of a record whose element the canvas edited. Scenes, nodes and links absent from
 * `scenes` are removed. Returns whether anything was written.
 */
export const writeViews = (content: ContentMap, scenes: RenderLists2D): boolean => {
  let changed = false;
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

  for (const scene of Object.values(scenes)) {
    const key = sceneKey(scene.id);
    const record: SceneRecord = {
      kind: 'scene',
      id: scene.id,
      ...(scene.name ? { name: scene.name } : {}),
      ...(scene.layers ? { layers: clone(scene.layers) } : {}),
      ...(scene.kind && scene.kind !== 'view' ? { sceneKind: scene.kind } : {}),
      ...(scene.anonymous ? { anonymous: true } : {}),
    };
    if (!same(content[key], record)) {
      content[key] = record;
      changed = true;
    }
    for (const node of Object.values(scene.nodes)) {
      // Compared as stored, so a record an earlier revision wrote is written again in the current words.
      const stored: unknown = content[nodeKey(node.id)];
      const existing = readNodeRecord(stored);
      if (!existing || existing.scene !== scene.id || !isRecord(stored) || !same(stored.node, node)) {
        const dsl = existing?.dsl;
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
      const stored: unknown = content[linkKey(link.id)];
      const existing = readLinkRecord(stored);
      if (!existing || existing.scene !== scene.id || !isRecord(stored) || !same(stored.link, link)) {
        const dsl = existing?.dsl;
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
    const element = readElementRecord(record);
    const stale =
      (isSceneRecord(record) && !scenes[record.id]) ||
      (element?.kind === 'node' && !scenes[element.scene]?.nodes[element.node.id]) ||
      (element?.kind === 'link' && !scenes[element.scene]?.links[element.link.id]);
    if (stale) {
      delete content[key];
      changed = true;
    }
  }
  return changed;
};

/** The scene record `id`, when the content has one. */
export const sceneRecordOf = (content: ContentMap, id: ViewId): SceneRecord | undefined => {
  const record: unknown = content[sceneKey(id)];
  return isSceneRecord(record) ? record : undefined;
};

/** Writes a node record into scene `scene`, in place; the node goes on the scene's bottom layer unless it names one. */
export const putNodeRecord = (content: ContentMap, scene: ViewId, node: Node): void => {
  content[nodeKey(node.id)] = { kind: 'node', scene, node: clone(node) } satisfies NodeRecord;
};
