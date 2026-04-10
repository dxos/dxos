//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SelectionSchema } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export const Select = Operation.make({
  meta: {
    key: `${meta.id}.operation.select`,
    name: 'Select',
    description: 'Select items in an attention context.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    contextId: Schema.String.annotations({ description: 'The id of the attention context.' }),
    selection: SelectionSchema.annotations({ description: 'The selection to apply.' }),
  }),
  output: Schema.Void,
});
