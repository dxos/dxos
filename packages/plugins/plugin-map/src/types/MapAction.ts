//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as SpaceForm from '@dxos/plugin-space/SpaceForm';

import * as MapCapabilities from './MapCapabilities.ts';

export const CreateMap = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotate({ title: 'Select pin type' }),
    SpaceForm.TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
    Schema.optional,
  ),
  locationFieldName: Schema.String.pipe(
    Schema.annotate({
      [MapCapabilities.LocationAnnotationId]: true,
      title: 'Location property',
    }),
    Schema.optional,
  ),
});

export type CreateMap = Schema.Schema.Type<typeof CreateMap>;
