//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

export namespace Template {
  export class Data extends Type.makeObject<Data>(DXN.make('org.dxos.type.data', '0.1.0'))(
    Schema.Struct({
      name: Schema.optional(Schema.String),
    }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--asterisk--regular', hue: 'sky' })),
  ) {}

  export const make = (props: Partial<Data>) => Obj.make(Data, props);
}
