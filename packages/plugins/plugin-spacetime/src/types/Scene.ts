//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CardAnnotation } from '@dxos/schema';

import * as Model from './Model.ts';

/** How objects are drawn: the editor's CAD look, or lit spheres with a rim glow over a lattice (animator F-4.5). */
export const Style = Schema.Literals(['cad', 'presentation']);
export type Style = Schema.Schema.Type<typeof Style>;

/** A link between two objects of the scene, by object id; drawn as a line, and what packet-flow effects bind to. */
export const Link = Schema.Struct({
  id: Schema.String,
  from: Schema.String,
  to: Schema.String,
  /** Line opacity where both ends are fully visible. */
  opacity: Schema.optional(Schema.Number),
});
export type Link = Schema.Schema.Type<typeof Link>;

export class Scene extends Type.makeObject<Scene>(DXN.make('org.dxos.type.spacetime.scene', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Owned objects: `SetParent` cascades each with the scene. */
    objects: Ref.Ref(Model.Object).pipe(
      Schema.Array,
      Annotation.SetParent.set(),
      Annotation.FormInputAnnotation.set(false),
    ),
    /** `cad` when unset. */
    style: Schema.optional(Style),
    links: Schema.optional(Schema.Array(Link).pipe(Annotation.FormInputAnnotation.set(false))),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--cube--regular', hue: 'teal' }),
    // Opts the type into card-content previews (the masonry tile renders the CardContent surface).
    CardAnnotation.set(true),
    Annotation.UserType.set(),
  ),
) {}

export const make = (props?: Partial<Omit<Scene, 'objects'>>) => {
  const defaultCube = Model.make({ primitive: 'cube' });
  return Obj.make(Scene, {
    objects: [Ref.make(defaultCube)],
    ...props,
  });
};
