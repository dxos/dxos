//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/schema';
import { Project } from '@dxos/types';

import { meta } from '../meta';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    space: SpaceSchema,
    name: Schema.optional(Schema.String),
    // TOOD(burdon): This should not be a literal.
    template: Schema.optional(Schema.Literal('org-research')),
  }),
  output: Schema.Struct({
    object: Project.Project,
  }),
}) {}
