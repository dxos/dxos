//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CardAnnotation } from '@dxos/schema';

import * as Model from './Model.ts';

export class Scene extends Type.makeObject<Scene>(DXN.make('org.dxos.type.spacetime.scene', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Owned objects: `SetParent` cascades each with the scene. */
    objects: Ref.Ref(Model.Object).pipe(
      Schema.Array,
      Annotation.SetParent.set(),
      Annotation.FormInputAnnotation.set(false),
    ),
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
