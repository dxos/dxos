//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { Bounds } from '@dxos/scene';

import * as Generator from './Generator.ts';

/** JSON schema of a generator's parameters, with `x-binding` on those that name nodes or links. */
const ParamsSchema = Schema.Record(Schema.String, Schema.Any).annotate({
  description:
    'JSON schema of the parameters ({ type: "object", properties }). A property with "x-binding": "node" or "link" holds node or link ids the runtime resolves to geometry at each step.',
});

const CompileErrors = Schema.Array(Schema.String).annotate({
  description: 'Compile errors; the generator is saved but draws nothing until they are fixed.',
});

export const CreateGenerator = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.createGenerator'),
    name: 'Create generator',
    description:
      'Saves a new generator (agent-written motion code) in the space and compiles it. Load the canvas generators skill for the contract first.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    source: Schema.String.annotate({
      description:
        "One TypeScript module whose default export is defineGenerator({ ... }) from '@dxos/react-ui-canvas/motion'.",
    }),
    params: Schema.optional(ParamsSchema),
  }),
  output: Schema.Struct({
    generator: Ref.Ref(Generator.Generator),
    version: Schema.Number,
    errors: Schema.optional(CompileErrors),
  }),
  services: [Database.Service],
});

export const UpdateGenerator = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.updateGenerator'),
    name: 'Update generator',
    description:
      'Revises a generator: replaces its source, parameter schema or description, bumps its version and compiles it. Canvases showing it replay from the nearest earlier time.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    generator: Ref.Ref(Generator.Generator),
    source: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    params: Schema.optional(ParamsSchema),
  }),
  output: Schema.Struct({
    version: Schema.Number,
    errors: Schema.optional(CompileErrors),
  }),
  services: [Database.Service],
});

export const InspectGenerator = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.inspectGenerator'),
    name: 'Inspect generator',
    description:
      'Runs a generator headless and reports: compile errors, its mean step time against the budget, whether the same times give the same shapes when reached from different checkpoints, and an SVG contact sheet of the frames. Use it to judge motion without watching it.',
    icon: 'ph--film-strip--regular',
  },
  input: Schema.Struct({
    generator: Ref.Ref(Generator.Generator),
    drawing: Schema.optional(
      Ref.Ref(Drawing.Drawing).annotate({ description: 'A drawing with the generator placed; its scene is used.' }),
    ),
    node: Schema.optional(Schema.String.annotate({ description: 'The generator node in the drawing to run.' })),
    params: Schema.optional(
      Schema.Record(Schema.String, Schema.Any).annotate({ description: 'Parameters, when no drawing is given.' }),
    ),
    bounds: Schema.optional(Bounds.annotate({ description: 'The node frame, when no drawing is given.' })),
    times: Schema.optional(
      Schema.Array(Schema.Number).annotate({ description: 'Seconds to draw; 0 to 3 by half seconds by default.' }),
    ),
  }),
  output: Schema.Struct({
    errors: Schema.optional(CompileErrors),
    status: Schema.optional(Schema.String),
    meanStepMs: Schema.optional(Schema.Number),
    budgetMs: Schema.optional(Schema.Number),
    deterministic: Schema.optional(Schema.Boolean),
    mismatch: Schema.optional(Schema.Number),
    frames: Schema.optional(Schema.Array(Schema.Struct({ t: Schema.Number, shapes: Schema.Number }))),
    sheet: Schema.optional(Schema.String.annotate({ description: 'SVG contact sheet, one cell per time.' })),
  }),
  services: [Database.Service],
});

export const AddGenerator = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.addGenerator'),
    name: 'Add generator',
    description: 'Adds a generator node to a scene of a drawing, with its parameters (bindings name node or link ids).',
    icon: 'ph--stamp--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing),
    generator: Ref.Ref(Generator.Generator),
    scene: Schema.optional(Schema.String.annotate({ description: 'Scene id; the root scene by default.' })),
    bounds: Bounds.annotate({ description: 'The node frame in scene coordinates.' }),
    params: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
    seed: Schema.optional(Schema.Number),
    layer: Schema.optional(Schema.String.annotate({ description: 'The scene layer; the bottom one by default.' })),
  }),
  output: Schema.Struct({
    node: Schema.String.annotate({ description: 'The new node id.' }),
  }),
  services: [Database.Service],
});

/** Automerge heads by key: a scene canvas's layouts by layout key; a legacy canvas's drawings by URI. */
const Heads = Schema.Record(Schema.String, Schema.Array(Schema.String)).annotate({
  description:
    "Automerge heads by key: each layout's by its key on a scene canvas; each drawing's by its URI on a legacy one (its own under the empty key).",
});

/** Leaf paths: `[layoutKey, 'elements', id, …]` on a scene canvas, `[viewId, 'nodes', id, …]` on a legacy one. */
const Paths = Schema.Array(Schema.Array(Schema.String)).annotate({
  description:
    "Leaf paths written: [layoutKey, 'elements', elementId, 'center', 'x'] on a scene canvas; [viewId, 'nodes', nodeId, 'center', 'x'] on a legacy one.",
});

export const Apply = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.apply'),
    name: 'Apply canvas intents',
    description:
      "Applies intents to a canvas, freehand, and returns the heads before and after and the paths written, which undo patches back. A scene canvas takes layout intents (create, delete, update, reorder, bind, move, rotate, scale, layout, batch; 3D also extrude, join, subtract) in its layout's dimension; a legacy canvas the engine's View intents.",
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    canvas: Ref.Ref(Obj.Unknown).annotate({ description: "The drawing's canvas: a scene canvas, or a legacy one." }),
    view: Schema.optional(
      Schema.String.annotate({
        description: "Layout key (a View id on a legacy canvas); the open scene's layout (the root View) by default.",
      }),
    ),
    intents: Schema.Array(Schema.Any).annotate({
      description: "`LayoutIntent`s on a scene canvas; the engine's `Intent`s on a legacy one.",
    }),
  }),
  output: Schema.Struct({
    canvas: Schema.String.annotate({ description: "The canvas object's id: the undo scope." }),
    before: Heads,
    after: Heads,
    paths: Paths,
  }),
});

export const Patch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.canvas.applyPatch'),
    name: 'Apply canvas patch',
    description:
      'Moves each path of a canvas from its value at `from` to its value at `to`, skipping a path someone has changed since; how canvas edits are undone and redone.',
    icon: 'ph--arrow-u-up-left--regular',
  },
  input: Schema.Struct({
    canvas: Ref.Ref(Obj.Unknown).annotate({ description: "The drawing's canvas: a scene canvas, or a legacy one." }),
    from: Heads,
    to: Heads,
    paths: Paths,
    context: Schema.optional(
      Schema.Any.annotate({ description: 'The View path and selection the canvas returns to on undo and redo.' }),
    ),
    mergeKey: Schema.optional(
      Schema.String.annotate({ description: 'Consecutive patches with one key fold into one undo step.' }),
    ),
  }),
  output: Schema.Struct({
    canvas: Schema.String.annotate({ description: "The canvas object's id: the undo scope." }),
    written: Schema.Number,
    unchanged: Schema.Number,
    skipped: Schema.Number.annotate({ description: 'Paths left alone because someone changed them since.' }),
  }),
});
