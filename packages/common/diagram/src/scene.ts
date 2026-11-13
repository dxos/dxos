//
// Copyright 2026 DXOS.org
//

//
// Backend-neutral scene DSL: a diagram is a set of named world objects ("face", "hat"),
// each composed of graphical elements (rect, ellipse, line, curve, text, arrow, portal)
// authored in object-local units. A backend's `ContentHandler` (tldraw, excalidraw, the SVG
// handler here) maps the scene onto its concrete canvas records; see `content.ts`.
//

import * as Schema from 'effect/Schema';

import { Shape } from '@dxos/scene';

/**
 * A semantic group of elements ("face", "hat") authored in its own local unit space.
 * `origin` (canvas px) and `scale` (px per unit) place it on the canvas:
 * `canvas = origin + local * scale`. On read, `origin` is derived as the top-left of the
 * object's bounding box, so the model survives users dragging shapes around.
 */
export const WorldObject = Schema.Struct({
  id: Schema.String.annotate({
    description: 'Stable object id naming the thing depicted (e.g. "face", "hat").',
  }),
  origin: Schema.optional(Shape.Point).annotate({
    description: 'Canvas position (px). Omit on upsert to keep the current position.',
  }),
  scale: Schema.optional(Schema.Number).annotate({ description: 'Canvas px per local unit (default 1).' }),
  index: Schema.optional(Schema.String).annotate({
    description: 'Fractional z-order index (e.g. "a1"); objects with one paint above those without, in index order.',
  }),
  ref: Schema.optional(Schema.String).annotate({
    description:
      'What the object depicts: an ECHO object reference (activating the node opens it) or any other URI or path, carried for tooling.',
  }),
  elements: Schema.Array(Shape.Element),
});
export type WorldObject = Schema.Schema.Type<typeof WorldObject>;

export const Scene = Schema.Struct({
  objects: Schema.Array(WorldObject),
});
export type Scene = Schema.Schema.Type<typeof Scene>;

//
// Edit commands.
//

export const UpsertObject = Schema.Struct({
  op: Schema.Literal('upsert-object'),
  object: WorldObject,
}).annotate({ description: 'Create an object, or replace an existing one wholesale (same id).' });

export const UpsertElements = Schema.Struct({
  op: Schema.Literal('upsert-elements'),
  objectId: Schema.String,
  elements: Schema.Array(Shape.Element),
}).annotate({ description: 'Add elements to an existing object, replacing any with matching ids.' });

export const RemoveElements = Schema.Struct({
  op: Schema.Literal('remove-elements'),
  objectId: Schema.String,
  elementIds: Schema.Array(Schema.String),
});

export const RemoveObject = Schema.Struct({
  op: Schema.Literal('remove-object'),
  objectId: Schema.String,
});

export const MoveObject = Schema.Struct({
  op: Schema.Literal('move-object'),
  objectId: Schema.String,
  origin: Shape.Point.annotate({ description: 'New canvas position (px) for the object top-left.' }),
});

export const Command = Schema.Union([UpsertObject, UpsertElements, RemoveElements, RemoveObject, MoveObject]);
export type Command = Schema.Schema.Type<typeof Command>;
