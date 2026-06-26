//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';

import * as Model from './Model';

export class Scene extends Type.makeObject<Scene>(DXN.make('org.dxos.type.spacetime.scene', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    objects: Ref.Ref(Model.Object).pipe(Schema.Array, FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--cube--regular', hue: 'teal' }),
  ),
) {}

export const make = (props?: Partial<Omit<Scene, 'objects'>>) => {
  const defaultCube = Model.make({ primitive: 'cube' });
  const scene = Obj.make(Scene, {
    objects: [Ref.make(defaultCube)],
    ...props,
  });
  Obj.setParent(defaultCube, scene);
  return scene;
};
