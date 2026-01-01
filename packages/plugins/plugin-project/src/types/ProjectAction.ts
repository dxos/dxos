//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/schema';
import { Project } from '@dxos/types';

import { meta } from '../meta';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    db: Database.Database,
    name: Schema.optional(Schema.String),
    // TOOD(burdon): This should not be a literal.
    template: Schema.optional(Schema.Literal('org-research')),
  }),
  output: Schema.Struct({
    object: Project.Project,
  }),
}) {}

//
// Operations
//

const PROJECT_OPERATION = `${meta.id}/operation`;

export namespace ProjectOperation {
  export const Create = Operation.make({
    meta: { key: `${PROJECT_OPERATION}/create`, name: 'Create Project' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        name: Schema.optional(Schema.String),
        template: Schema.optional(Schema.Literal('org-research')),
      }),
      output: Schema.Struct({
        object: Project.Project,
      }),
    },
  });
}
