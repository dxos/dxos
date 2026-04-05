//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

import { Object as ModelObject, make as makeObject } from './Model';

export namespace Spacetime {
  export const Scene = Schema.Struct({
    name: Schema.optional(Schema.String),
    objects: Ref.Ref(ModelObject).pipe(Schema.Array, FormInputAnnotation.set(false)),
  }).pipe(
    Type.object({
      typename: 'org.dxos.type.spacetime.scene',
      version: '0.1.0',
    }),
    Annotation.IconAnnotation.set({
      icon: 'ph--cube--regular',
      hue: 'teal',
    }),
  );

  export type Scene = Schema.Schema.Type<typeof Scene>;

  export const make = (props?: Partial<Omit<Scene, 'objects'>>) => {
    const defaultCube = makeObject({ primitive: 'cube' });
    const scene = Obj.make(Scene, {
      objects: [Ref.make(defaultCube)],
      ...props,
    });
    Obj.setParent(defaultCube, scene);
    return scene;
  };
}
