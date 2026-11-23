//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Selection } from '@dxos/react-ui-attention/types';

import { AttentionNamespace } from '../namespace.ts';

const ATTENTION_ACTION = `${AttentionNamespace.key}.action`;

export class Select extends Schema.TaggedClass<Select>()(`${ATTENTION_ACTION}.select`, {
  input: Schema.Struct({
    contextId: Schema.String,
    selection: Selection.Selection,
  }),
  output: Schema.Void,
}) {}
