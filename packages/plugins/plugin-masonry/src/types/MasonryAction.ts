//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

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
