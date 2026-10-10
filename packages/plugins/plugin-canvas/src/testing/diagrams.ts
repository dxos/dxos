//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Dsl, DxSvg } from '@dxos/diagram';
import { type Database, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { CanvasBuilder, createCanvas, elementId, isNodeRecord, nodeKey, updateCanvasRecord } from '#model';

/** The part of a `.dx.svg` payload a drawing is rebuilt from: the semantic-DSL source it was rendered from. */
const DslSource = Schema.Struct({
  source: Schema.Struct({ language: Schema.Literal('dsl'), text: Schema.String }),
});

export type DiagramSet = {
  /** The diagram opened first. */
  root: string;
  /** Each diagram's `.dx.svg` text, by diagram id. */
  files: Readonly<Record<string, string>>;
  /** Each diagram's drawing name, by diagram id. */
  names: Readonly<Record<string, string>>;
  /** Per diagram, the boxes (by DSL node id) that open another diagram (by id) as a nested level. */
  drills: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

/**
 * Adds one canvas drawing per diagram of the set to `db`, each laid out from the DSL source its `.dx.svg` carries, and
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
  for (const [id, svg] of Object.entries(set.files)) {
    const { source } = Schema.decodeUnknownSync(DslSource)(DxSvg.extract(svg));
    const { commands } = await EffectEx.runPromise(Dsl.compile(source.text));
    const canvas = db.add(createCanvas());
    CanvasBuilder.apply(canvas, commands);
    // The diagrams are laid out on the canvas lattice (`box`, `grid` and `@` origin match its cells), so turning it on
    // routes links square along the gutters between the boxes.
    Obj.update(canvas, (canvas) => updateCanvasRecord(canvas.content, { lattice: true }));
    drawings.set(id, db.add(Drawing.make({ name: set.names[id] ?? id, canvas })));
  }

  for (const [id, drills] of Object.entries(set.drills)) {
    const canvas = drawings.get(id)?.canvas.target;
    if (!canvas) {
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
          node: { ...record.node, type: 'frame', scene: box, object: Ref.make(child) },
        };
      }
    });
  }

  return drawings;
};
