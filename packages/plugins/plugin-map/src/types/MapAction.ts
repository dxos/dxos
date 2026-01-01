//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

import { meta } from '../meta';

import * as Map from './Map';
import { LocationAnnotationId } from './types';

export const CreateMap = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select pin type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
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

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    db: Database.Database,
  }).pipe(
    // prettier-ignore
    Schema.extend(CreateMap),
    Schema.extend(Map.Map.pipe(Schema.pick('center', 'zoom', 'coordinates'))),
  ),
  output: Schema.Struct({
    object: Map.Map,
  }),
}) {}

export class Toggle extends Schema.TaggedClass<Toggle>()(`${meta.id}/action/toggle`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

const MAP_OPERATION = `${meta.id}/operation`;

export namespace MapOperation {
  export const Create = Operation.make({
    meta: { key: `${MAP_OPERATION}/create`, name: 'Create Map' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
      }).pipe(
        Schema.extend(CreateMap),
        Schema.extend(Map.Map.pipe(Schema.pick('center', 'zoom', 'coordinates'))),
      ),
      output: Schema.Struct({
        object: Map.Map,
      }),
    },
  });

  export const Toggle = Operation.make({
    meta: { key: `${MAP_OPERATION}/toggle`, name: 'Toggle Map' },
    schema: {
      input: Schema.Void,
      output: Schema.Void,
    },
  });
}
