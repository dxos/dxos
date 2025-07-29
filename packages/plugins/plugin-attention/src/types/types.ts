//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SelectionSchema } from '@dxos/react-ui-attention';

import { ATTENTION_PLUGIN } from '../meta';

export namespace AttentionAction {
  const ATTENTION_ACTION = `${ATTENTION_PLUGIN}/action`;

  export class Select extends Schema.TaggedClass<Select>()(`${ATTENTION_ACTION}/select`, {
    input: Schema.Struct({
      contextId: Schema.String,
      selection: SelectionSchema,
    }),
    output: Schema.Void,
  }) {}
}
