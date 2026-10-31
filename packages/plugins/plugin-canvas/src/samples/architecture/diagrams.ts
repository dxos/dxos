//
// Copyright 2026 DXOS.org
//

import { type ContentMap } from '@dxos/diagram';
import { type Database, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import {
  CanvasLayoutBuilder,
  editCanvasContent,
  elementId,
  isNodeRecord,
  makeCanvas,
  nodeKey,
  readCanvasContent,
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
export const canvasDrawingSchemas = [Drawing.Drawing, ...schemaTypes];

export type CanvasDrawingProps = {
  name: string;
  /** Scene commands the canvas is built from. */
  commands: CompiledDiagrams[string];
  /** Shapes snap to the canvas lattice and links route along its gutters. */
  lattice?: boolean;
  /** Opens read-only until a viewer chooses to edit. */
  readonly?: boolean;
};

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
    setLayoutLattice(canvas, true);
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

  for (const [id, drills] of Object.entries(set.drills)) {
    editDrawingContent(drawings.get(id), (content) => {
      for (const [box, target] of Object.entries(drills)) {
        // A semantic node compiles to the element `box` of the object it names.
        const nodeId = elementId(box, 'box');
        const record = content[nodeKey(nodeId)];
        const child = drawings.get(target);
        if (!isNodeRecord(record) || !child) {
          continue;
        }
        // The box becomes a frame in place, so its links stay attached; the frame opens the child drawing.
        content[`scene:${box}`] = { kind: 'scene', id: box };
        content[nodeKey(nodeId)] = {
          ...record,
          node: { ...record.node, type: 'view', scene: box, link: { object: Ref.make(child) } },
        };
      }
    });
  }

  return drawings;
};
