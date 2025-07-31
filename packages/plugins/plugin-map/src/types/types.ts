//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/react-client/echo';
import { DataType, TypenameAnnotationId } from '@dxos/schema';

import { MAP_PLUGIN } from '../meta';

// TODO(wittjosiah): Factor out?
export const LocationAnnotationId = Symbol.for('@dxos/plugin-map/annotation/Location');

export const CreateMapSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['dynamic'],
      title: 'Record',
    }),
  ),
  locationFieldId: Schema.String.annotations({
    [LocationAnnotationId]: true,
    title: 'Location property',
  }),
});

export type CreateMapType = Schema.Schema.Type<typeof CreateMapSchema>;

export namespace MapAction {
  const MAP_ACTION = `${MAP_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${MAP_ACTION}/create`, {
    input: Schema.extend(Schema.Struct({ space: SpaceSchema }), CreateMapSchema),
    output: Schema.Struct({ object: DataType.View }),
  }) {}

  export class Toggle extends Schema.TaggedClass<Toggle>()(`${MAP_ACTION}/toggle`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
