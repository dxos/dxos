//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';
import { SelectionSchema } from '@dxos/react-ui-attention';

import { meta } from '../meta';

export namespace AttentionAction {
  const ATTENTION_ACTION = `${meta.id}/action`;

  export class Select extends Schema.TaggedClass<Select>()(`${ATTENTION_ACTION}/select`, {
    input: Schema.Struct({
      contextId: Schema.String,
      selection: SelectionSchema,
    }),
    output: Schema.Void,
  }) {}
}

export namespace AttentionOperation {
  export const Select = Operation.make({
    meta: {
      key: `${meta.id}/operation/select`,
      name: 'Select',
      description: 'Select items in an attention context.',
    },
    schema: {
      input: Schema.Struct({
        contextId: Schema.String.annotations({ description: 'The id of the attention context.' }),
        selection: SelectionSchema.annotations({ description: 'The selection to apply.' }),
      }),
      output: Schema.Void,
    },
  });
}
