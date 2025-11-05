//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

const EXPLORER_ACTION = `${meta.id}/action`;

export const GraphProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.String.annotations({
    [TypenameAnnotationId]: ['used-static', 'dynamic'],
    title: 'Select graph record type',
  }),
});

export class CreateGraph extends Schema.TaggedClass<CreateGraph>()(`${EXPLORER_ACTION}/create-graph`, {
  input: Schema.Struct({
    space: SpaceSchema,
  }).pipe(Schema.extend(GraphProps)),
  output: Schema.Struct({
    object: DataType.View.View,
  }),
}) {}
