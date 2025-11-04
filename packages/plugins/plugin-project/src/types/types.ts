//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export namespace Project {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
      template: Schema.optional(Schema.Literal('org-research')),
    }),
    output: Schema.Struct({
      object: DataType.Project.Project,
    }),
  }) {}
}
