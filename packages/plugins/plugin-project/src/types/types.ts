//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export namespace Project {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: DataType.Project,
    }),
  }) {}
}
