//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Diagnostics, Scene } from '@dxos/diagram';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as Drawing from './Drawing.ts';

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.create'),
    name: 'Create Drawing',
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    variant: Schema.optional(Schema.String).annotate({
      description: 'Variant id (canvas typename); defaults to the first registered variant.',
    }),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Drawing.Drawing),
  }),
  services: [Capability.Service, Database.Service],
});

/** The scene as derived from the live canvas. */
const SceneOutput = {
  scene: Scene.Scene.annotate({ description: 'The diagram as world objects with object-local coordinates.' }),
  unmanaged: Schema.Number.annotate({
    description: 'Number of shapes on the canvas not managed by the DSL (drawn by users).',
  }),
};

export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.read'),
    name: 'Read Drawing',
    description:
      'Returns the current scene of a drawing: world objects (by id) with their elements in object-local units. Call before editing an existing drawing.',
    icon: 'ph--eye--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotate({ description: 'The drawing to read.' }),
  }),
  output: Schema.Struct(SceneOutput),
  services: [Capability.Service, Database.Service],
});

export const Edit = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.edit'),
    name: 'Edit Drawing',
    description:
      'Applies scene commands to a drawing: upsert/move/remove world objects or individual elements by id. Returns the resulting scene.',
    icon: 'ph--pencil-simple-line--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotate({ description: 'The drawing to edit.' }),
    commands: Schema.Array(Scene.Command).annotate({ description: 'Commands applied in order, atomically.' }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotate({ description: 'Object ids created or modified.' }),
    removed: Schema.Number.annotate({ description: 'Number of shapes removed.' }),
  }),
  services: [Capability.Service, Database.Service],
});

export const Draw = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.draw'),
    name: 'Draw Diagram',
    description:
      'Applies a diagram written in the native text DSL, where you choose every coordinate. Use this to author a diagram precisely, or to hand-edit one that `generate` laid out; use `generate` instead when you want the layout done for you.',
    icon: 'ph--code--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotate({ description: 'The drawing to draw into.' }),
    source: Schema.String.annotate({
      description: [
        'Diagram DSL. Statements are `object <id> [@ <x>,<y>] [scale=] [index=] [ref=] { <element>* }`,',
        '`elements <objectId> { … }`, `move <id> @ <x>,<y>`, `remove object <id>`, `remove elements <id> <ids…>`.',
        'An element is `<kind> <id> <geometry> ["label"] <name=value>*` where kind is rect/ellipse/diamond/triangle',
        '(`x,y WxH`), circle (`cx,cy r`), line/curve (two or more `x,y`), arc (`cx,cy r a0..a1`), text (`x,y "s"`),',
        'arrow (`<end> -> <end>`, each end a ref like `Obj/elem#port`, a point, or `_`), or portal (`x,y WxH ref="<dxn>"`).',
      ].join(' '),
    }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotate({ description: 'Object ids created or modified.' }),
    removed: Schema.Number.annotate({ description: 'Number of shapes removed.' }),
    problems: Schema.Array(
      Schema.Struct({
        severity: Schema.Literals(['error', 'warning']),
        message: Schema.String,
        line: Schema.Number,
        column: Schema.Number,
      }),
    ).annotate({
      description:
        'Syntax and schema problems in the source, with 1-based line/column. A single `error` leaves the drawing untouched — fix it and draw again.',
    }),
    diagnostics: Schema.Array(Diagnostics.Diagnostic).annotate({
      description:
        'Layout report over the resulting scene. Fix every `error` (overlap, connector through a node, label overflow) by moving or resizing the offending elements and drawing again.',
    }),
  }),
  services: [Capability.Service, Database.Service],
});

export const Generate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.generate'),
    name: 'Generate Drawing',
    description:
      'Replaces a drawing with a diagram compiled from a mermaid description (flowchart or classDiagram). The dialect owns layout, so no coordinates are supplied.',
    icon: 'ph--graph--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotate({ description: 'The drawing to generate into.' }),
    source: Schema.String.annotate({
      description:
        'Mermaid source: a flowchart or a classDiagram. Flowcharts may carry `%% ref <nodeId> <target>` lines saying what a node depicts: an ECHO object reference opens on activation; other URIs and paths are carried for tooling.',
    }),
  }),
  output: Schema.Struct({
    ...SceneOutput,
    upserted: Schema.Array(Schema.String).annotate({ description: 'Object ids created or modified.' }),
    diagnostics: Schema.Array(Diagnostics.Diagnostic).annotate({
      description:
        'Layout report. Fix every `error` (overlap, connector through a node, label overflow) by simplifying or splitting the diagram and regenerating; `warning`s (crossings, bends) are quality hints.',
    }),
  }),
  services: [Capability.Service, Database.Service],
});

export const Score = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.illustrator.score'),
    name: 'Score Drawing',
    description:
      'Grades the drawing as laid out, on one 0–1 scale (1 is good): each layout constraint (pass 1 / fail 0) and cost ' +
      'term (crossings, overlapping arrows, overlapping labels, bends, length, gaps, compactness), their overall score, ' +
      'and the diagnostics behind them. Call after Generate to decide what to change before regenerating.',
    icon: 'ph--gauge--regular',
  },
  input: Schema.Struct({
    drawing: Ref.Ref(Drawing.Drawing).annotate({ description: 'The drawing to score.' }),
  }),
  output: Schema.Struct({
    overall: Schema.optional(Schema.Number).annotate({
      description: 'The worst constraint gating the mean of the cost scores; absent when nothing could be scored.',
    }),
    scores: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        kind: Schema.String,
        score: Schema.Number,
        detail: Schema.optional(Schema.String),
      }),
    ),
    diagnostics: Schema.Array(Diagnostics.Diagnostic),
  }),
  services: [Capability.Service, Database.Service],
});
