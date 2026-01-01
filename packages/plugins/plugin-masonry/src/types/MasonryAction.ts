//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

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
  input: Schema.extend(Schema.Struct({ db: Database.Database }), MasonryProps),
  output: Schema.Struct({
    object: Masonry.Masonry,
  }),
}) {}

//
// Operations
//

const MASONRY_OPERATION = `${meta.id}/operation`;

export namespace MasonryOperation {
  export const CreateMasonry = Operation.make({
    meta: { key: `${MASONRY_OPERATION}/create`, name: 'Create Masonry' },
    schema: {
      input: Schema.extend(Schema.Struct({ db: Database.Database }), MasonryProps),
      output: Schema.Struct({
        object: Masonry.Masonry,
      }),
    },
  });
}
