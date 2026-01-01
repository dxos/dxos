//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

export namespace Template {
  export const Data = Schema.Struct({
    name: Schema.optional(Schema.String),
  }).pipe(
    Type.Obj({
      typename: 'dxos.org/type/Data',
      version: '0.1.0',
    }),
  );

  export type Data = Schema.Schema.Type<typeof Data>;

  export const make = (props: Partial<Data>) => Obj.make(Data, props);
}
