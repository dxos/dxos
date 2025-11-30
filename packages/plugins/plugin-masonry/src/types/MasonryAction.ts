//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';
import { SpaceSchema } from '@dxos/react-client/echo';

import { meta } from '../meta';

import * as Masonry from './Masonry';

const MASONRY_ACTION = `${meta.id}/action`;

export const MasonryProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select card type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    }),
    Schema.optional,
  ),
});

export class CreateMasonry extends Schema.TaggedClass<CreateMasonry>()(`${MASONRY_ACTION}/create`, {
  input: Schema.extend(Schema.Struct({ space: SpaceSchema }), MasonryProps),
  output: Schema.Struct({
    object: Masonry.Masonry,
  }),
}) {}
