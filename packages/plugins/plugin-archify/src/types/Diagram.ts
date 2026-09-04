//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { CardAnnotation, CollectionItemAnnotation } from '@dxos/schema';

import { Ir } from '#model';

/**
 * An Archify diagram: a name and the typed IR that produces it.
 *
 * The IR is stored structurally rather than as a JSON blob so that ECHO merges concurrent edits
 * field by field, and so the agent's tool schema is the diagram schema — the model authors the
 * same document the renderer consumes, with no serialization step in between.
 */
export class Diagram extends Type.makeObject<Diagram>(DXN.make('org.dxos.type.archify.diagram', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    source: Ir.Architecture.annotate({ description: 'The Archify architecture IR rendered by this diagram.' }),
  })
    // Agents replace the whole document on every write, so both fields must be assignable.
    .mapFields(Struct.map(Schema.mutableKey))
    .pipe(
      LabelAnnotation.set(['name']),
      Annotation.IconAnnotation.set({ icon: 'ph--tree-structure--regular', hue: 'cyan' }),
      CardAnnotation.set(true),
      CollectionItemAnnotation.set(true),
    ),
) {}

export type MakeOptions = {
  name?: string;
  source?: Ir.Architecture;
};

/** Creates a diagram; without a source it starts from a single placeholder component. */
export const make = ({ name, source }: MakeOptions = {}): Diagram =>
  Obj.make(Diagram, { name, source: source ?? Ir.emptyArchitecture(name ?? 'Untitled diagram') });

/** Type guard for {@link Diagram} objects. */
export const isDiagram = (object: unknown): object is Diagram => Obj.instanceOf(Diagram, object);
