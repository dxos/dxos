//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

export namespace Spacetime {
  export const Scene = Schema.Struct({
    name: Schema.optional(Schema.String),
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

  export const make = (props?: Partial<Scene>) => Obj.make(Scene, props ?? {});
}
