//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as SpaceForm from '@dxos/plugin-space/SpaceForm';

export const GraphProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotate({ title: 'Select type' }),
    SpaceForm.TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
    Schema.optional,
  ),
});
