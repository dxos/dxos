//
// Copyright 2026 DXOS.org
//

import { type ContentMap } from '@dxos/diagram';
import { type Database, type Type } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import {
  CanvasLayoutBuilder,
  type LinkRecord,
  type SceneRecord,
  clone,
  editCanvasContent,
  elementId,
  isLinkRecord,
  isNodeRecord,
  linkKey,
  makeCanvas,
  nodeKey,
  putNodeRecord,
  readCanvasContent,
  rootOf,
  sceneKey,
  sceneRecordOf,
  setLayoutLattice,
} from '#model';
import { Canvas } from '#types';

import schemaTypes from '../../capabilities/schema.ts';
import { type CompiledDiagrams } from './compiled.ts';

export type DiagramSet = {
  /** The diagram opened first. */
  root: string;
  /** Each diagram's compiled scene commands (from its `.dx` source), by diagram id. */
  diagrams: CompiledDiagrams;
  /** Each diagram's drawing name, by diagram id. */
  names: Readonly<Record<string, string>>;
  /** Per diagram, the boxes (by DSL node id) that open another diagram (by id) as a nested level. */
  drills: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

/** The schemas a space of canvas drawings registers: the drawing, and its canvas with the scene objects it reaches. */
export const canvasDrawingSchemas: readonly Type.AnyEntity[] = [Drawing.Drawing, ...schemaTypes];

export type CanvasDrawingProps = {
  name: string;
  /** Scene commands the canvas is built from. */
  commands: CompiledDiagrams[string];
  /** Shapes snap to the canvas lattice and links route along its gutters. */
  lattice?: boolean;
  /** Opens read-only until a viewer chooses to edit. */
  readonly?: boolean;
};

/**
 * The lattice the reference diagrams are drawn on: their `box`, `grid` and `@` origins are its cells, so it is theirs
 * whatever lattice a new drawing takes by default.
 */
export const DIAGRAM_LATTICE = { width: 256, height: 128, gutterX: 128, gutterY: 64 } as const;

/** The tone the reference diagrams' plain boxes take: the style set's second (index 1). */
export const DIAGRAM_BOX_TONE = 1;

/** The tone the reference diagrams' dashed group outlines take: the style set's fourth (index 3), its lightest. */
export const DIAGRAM_GROUP_TONE = 3;

/** Adds a canvas drawing built from scene commands to `db`. */
export const addCanvasDrawing = (
  db: Database.Database,
  { name, commands, lattice, readonly }: CanvasDrawingProps,
): Drawing.Drawing => {
  const { canvas, model, layout, scene } = makeCanvas(readonly ? { readonly } : {});
  for (const object of [model, layout, scene]) {
    db.add(object);
  }
  db.add(canvas);
  CanvasLayoutBuilder.apply(canvas, commands);
  if (lattice) {
    setLayoutLattice(canvas, true, DIAGRAM_LATTICE);
  }
  return db.add(Drawing.make({ name, canvas }));
};

/** Loads a drawing's `Canvas` with the scenes and layouts it reaches, so its content records read whole. */
export const loadDrawingCanvas = async (drawing: Drawing.Drawing): Promise<Canvas.Canvas | undefined> => {
  const canvas = await drawing.canvas.load();
  if (!Canvas.isCanvas(canvas)) {
    return undefined;
  }
  // Every layout a scene views is one of the canvas's own.
  await Promise.all([...canvas.scenes, ...canvas.layouts].map((ref) => ref.load()));
  return canvas;
};

/** A loaded drawing's canvas as content records (`node:<id>`, `link:<id>`, …), empty for a canvas of another kind. */
export const readDrawingContent = (drawing: Drawing.Drawing): ContentMap => {
  const canvas = drawing.canvas.target;
  return Canvas.isCanvas(canvas) ? readCanvasContent(canvas) : {};
};

/** Edits a loaded drawing's canvas through its content records, written back element by element. */
export const editDrawingContent = (drawing: Drawing.Drawing | undefined, edit: (content: ContentMap) => void) => {
  const canvas = drawing?.canvas.target;
  if (Canvas.isCanvas(canvas)) {
    editCanvasContent(canvas, edit);
  }
};

/**
 * Adds one canvas drawing per diagram of the set to `db`, each built from its compiled commands, and
 * turns every drill-down box into a frame onto the diagram it names; answers the root drawing.
 */
export const loadDiagramSet = async (db: Database.Database, set: DiagramSet): Promise<Drawing.Drawing> => {
  const root = (await loadDiagramDrawings(db, set)).get(set.root);
  if (!root) {
    throw new Error(`The diagram set has no root diagram: ${set.root}.`);
  }
  return root;
};

/** {@link loadDiagramSet}'s drawings, every one of them, by diagram id. */
export const loadDiagramDrawings = async (
  db: Database.Database,
  set: DiagramSet,
): Promise<ReadonlyMap<string, Drawing.Drawing>> => {
  const drawings = new Map<string, Drawing.Drawing>();
  for (const [id, commands] of Object.entries(set.diagrams)) {
    // The diagrams are laid out on the canvas lattice (`box`, `grid` and `@` origin match its cells), so turning it on
    // routes links square along the gutters between the boxes.
    // Reference diagrams: they open read-only until a viewer chooses to edit.
    drawings.set(id, addCanvasDrawing(db, { name: set.names[id] ?? id, commands, lattice: true, readonly: true }));
  }

  // Plain boxes draw in the style set's second tone rather than its heavier default grey, and the dashed group outlines
  // in its lightest, so the coloured boxes carry the emphasis; a box that sets a hue or a tone of its own keeps it.
  for (const drawing of drawings.values()) {
    editDrawingContent(drawing, (content) => {
      for (const [key, record] of Object.entries(content)) {
        if (!isNodeRecord(record) || record.node.style?.tone !== undefined) {
          continue;
        }
        const tone = record.node.style?.guide
          ? DIAGRAM_GROUP_TONE
          : (record.node.style?.hue ?? 'neutral') === 'neutral'
            ? DIAGRAM_BOX_TONE
            : undefined;
        if (tone !== undefined) {
          content[key] = { ...record, node: { ...record.node, style: { ...record.node.style, tone } } };
        }
      }
    });
  }

  // Each drawing's own diagram, read before any nesting, is what a box that drills into it shows.
  const own = new Map([...drawings].map(([id, drawing]) => [id, readDrawingContent(drawing)]));
  for (const [id, drawing] of drawings) {
    if (!set.drills[id]) {
      continue;
    }
    editDrawingContent(drawing, (content) => nestDrills(content, set, own, id, rootOf(content), new Set([id])));
    // The nested scenes are new layouts, which take the lattice the drawing's own layout has.
    const canvas = drawing.canvas.target;
    Canvas.isCanvas(canvas) && setLayoutLattice(canvas, true, DIAGRAM_LATTICE);
  }

  return drawings;
};

/**
 * Turns each drill-down box of `diagram` (in scene `scene` of `content`) into a frame onto a nested scene holding a copy
 * of the diagram it names, recursively, so zooming into a box drills into that diagram in place and zooming out comes
 * back. A copy rather than a link: a frame onto another drawing opens that drawing instead of drilling. The nested
 * scene's id prefixes its records' ids, so a diagram reached on two paths does not collide with itself.
 */
const nestDrills = (
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
    // A semantic node compiles to the element `box` of the object it names.
    const key = nodeKey(`${prefix}${elementId(box, 'box')}`);
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
