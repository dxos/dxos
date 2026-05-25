//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

import * as Model from './Model';

export const Scene = Schema.Struct({
  name: Schema.optional(Schema.String),
  objects: Ref.Ref(Model.Object).pipe(Schema.Array, FormInputAnnotation.set(false)),
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--cube--regular',
    hue: 'teal',
  }),
  Type.makeObject(DXN.make('org.dxos.type.spacetime.scene', '0.1.0')),
);

export type Scene = Type.InstanceType<typeof Scene>;

export const make = (props?: Partial<Omit<Scene, 'objects'>>) => {
  const defaultCube = Model.make({ primitive: 'cube' });
  const scene = Obj.make(Scene, {
    objects: [Ref.make(defaultCube)],
    ...props,
  });
  Obj.setParent(defaultCube, scene);
  return scene;
};
