//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Selection } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export namespace AttentionAction {
  const ATTENTION_ACTION = `${meta.profile.key}.action`;

  export class Select extends Schema.TaggedClass<Select>()(`${ATTENTION_ACTION}.select`, {
    input: Schema.Struct({
      contextId: Schema.String,
      selection: Selection,
    }),
    output: Schema.Void,
  }) {}
}
