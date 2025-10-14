//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from '../meta';

import { Game } from './Chess';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    pgn: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Game,
  }),
}) {}
