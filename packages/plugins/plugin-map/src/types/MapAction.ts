//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { meta } from '../meta';

import { LocationAnnotationId } from './types';

export const CreateMap = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['dynamic'],
      title: 'Record type',
    }),
  ),
  locationFieldId: Schema.String.annotations({
    [LocationAnnotationId]: true,
    title: 'Location property',
  }),
});

export type CreateMap = Schema.Schema.Type<typeof CreateMap>;

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.extend(
    Schema.Struct({
      space: SpaceSchema,
    }),
    CreateMap,
  ),
  output: Schema.Struct({
    object: DataType.View,
  }),
}) {}

export class Toggle extends Schema.TaggedClass<Toggle>()(`${meta.id}/action/toggle`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}
