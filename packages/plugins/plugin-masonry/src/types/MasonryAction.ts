//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

const MASONRY_ACTION = `${meta.id}/action`;

export const MasonryProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['used-static', 'dynamic'],
      title: 'Select card record type (leave empty to start fresh)',
    }),
  ),
});

export class CreateMasonry extends Schema.TaggedClass<CreateMasonry>()(`${MASONRY_ACTION}/create`, {
  input: Schema.extend(Schema.Struct({ space: SpaceSchema }), MasonryProps),
  output: Schema.Struct({
    object: DataType.View,
  }),
}) {}
