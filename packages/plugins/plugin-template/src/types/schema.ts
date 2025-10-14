//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { ReactiveObjectSchema } from '@dxos/react-client/echo';

import { meta } from '../meta';

export namespace Template {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ReactiveObjectSchema,
    }),
  }) {}

  export class Data extends TypedObject({
    typename: 'dxos.org/type/Data',
    version: '0.1.0',
  })({
    name: Schema.optional(Schema.String),
  }) {}

  export const make = (props: Partial<Data>) => Obj.make(Data, props);
}
