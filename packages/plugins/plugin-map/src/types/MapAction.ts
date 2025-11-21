//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/react-client/echo';
import { TypenameAnnotationId, View } from '@dxos/schema';

import { meta } from '../meta';

import { Map } from './Map';
import { LocationAnnotationId } from './types';

export const CreateMap = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.annotations({
    [TypenameAnnotationId]: ['used-static', 'dynamic'],
    title: 'Select pin record type',
  }),
  locationFieldName: Schema.String.pipe(
    Schema.annotations({
      [LocationAnnotationId]: true,
      title: 'Location property',
    }),
    Schema.optional,
  ),
});

export type CreateMap = Schema.Schema.Type<typeof CreateMap>;

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    space: SpaceSchema,
  }).pipe(
    // prettier-ignore
    Schema.extend(CreateMap),
    Schema.extend(Map.pipe(Schema.pick('center', 'zoom', 'coordinates'))),
  ),
  output: Schema.Struct({
    object: View.View,
  }),
}) {}

export class Toggle extends Schema.TaggedClass<Toggle>()(`${meta.id}/action/toggle`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}
