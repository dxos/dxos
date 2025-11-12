//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

import * as Graph from './Graph';

const EXPLORER_ACTION = `${meta.id}/action`;

export const GraphProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.annotations({
    [TypenameAnnotationId]: 'setup-in-space',
    title: 'Select graph record type',
  }),
});

export class CreateGraph extends Schema.TaggedClass<CreateGraph>()(`${EXPLORER_ACTION}/create-graph`, {
  input: Schema.Struct({
    space: SpaceSchema,
  }).pipe(Schema.extend(GraphProps)),
  output: Schema.Struct({
    object: Graph.Graph,
  }),
}) {}
