//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

export const GraphProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    }),
    Schema.optional,
  ),
});
