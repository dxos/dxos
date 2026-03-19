//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

export namespace Template {
  export const Data = Schema.Struct({
    name: Schema.optional(Schema.String),
  }).pipe(
    Type.object({
      typename: 'org.dxos.type.data',
      version: '0.1.0',
    }),
    Annotation.IconAnnotation.set({
      icon: 'ph--asterisk--regular',
      hue: 'sky',
    }),
  );

  export type Data = Schema.Schema.Type<typeof Data>;

  export const make = (props: Partial<Data>) => Obj.make(Data, props);
}
