//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { CanvasBuilder, createCanvas, elementId, isNodeRecord, nodeKey, updateCanvasRecord } from '#model';

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
  const canvas = db.add(createCanvas());
  CanvasBuilder.apply(canvas, commands);
  if (lattice || readonly) {
    Obj.update(canvas, (canvas) => updateCanvasRecord(canvas.content, { lattice, readonly }));
  }
  return db.add(Drawing.make({ name, canvas }));
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
    const canvas = drawing.canvas.target;
    if (!Drawing.isCanvas(canvas)) {
      continue;
    }
    Obj.update(canvas, (canvas) => {
      for (const [key, record] of Object.entries(canvas.content)) {
        if (!isNodeRecord(record) || record.node.style?.tone !== undefined) {
          continue;
        }
        const tone = record.node.style?.guide
          ? DIAGRAM_GROUP_TONE
          : (record.node.style?.hue ?? 'neutral') === 'neutral'
            ? DIAGRAM_BOX_TONE
            : undefined;
        if (tone !== undefined) {
          canvas.content[key] = { ...record, node: { ...record.node, style: { ...record.node.style, tone } } };
        }
      }
    });
  }

  for (const [id, drills] of Object.entries(set.drills)) {
    const canvas = drawings.get(id)?.canvas.target;
    if (!Drawing.isCanvas(canvas)) {
      continue;
    }
    Obj.update(canvas, (canvas) => {
      for (const [box, target] of Object.entries(drills)) {
        // A semantic node compiles to the element `box` of the object it names.
        const nodeId = elementId(box, 'box');
        const record = canvas.content[nodeKey(nodeId)];
        const child = drawings.get(target);
        if (!isNodeRecord(record) || !child) {
          continue;
        }
        // The box becomes a frame in place, so its links stay attached; the frame opens the child drawing.
        canvas.content[`scene:${box}`] = { kind: 'scene', id: box };
        canvas.content[nodeKey(nodeId)] = {
          ...record,
          node: { ...record.node, type: 'view', scene: box, link: { object: Ref.make(child) } },
        };
      }
    });
  }

  return drawings;
};
