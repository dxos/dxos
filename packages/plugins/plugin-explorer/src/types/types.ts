//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from '../meta';

import { ViewType } from './schema';

export namespace ExplorerAction {
  const EXPLORER_ACTION = `${meta.id}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${EXPLORER_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ViewType,
    }),
  }) {}
}
