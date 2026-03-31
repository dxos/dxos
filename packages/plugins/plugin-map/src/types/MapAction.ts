//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

import { LocationAnnotationId } from './types';

export const CreateMap = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select pin type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
    Schema.optional,
  ),
  locationFieldName: Schema.String.pipe(
    Schema.annotations({
      [LocationAnnotationId]: true,
      title: 'Location property',
    }),
    Schema.optional,
  ),
});

export type CreateMap = Schema.Schema.Type<typeof CreateMap>;
