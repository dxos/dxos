//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { ViewType } from './schema';
import { EXPLORER_PLUGIN } from '../meta';

export namespace ExplorerAction {
  const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${EXPLORER_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ViewType,
    }),
  }) {}
}
