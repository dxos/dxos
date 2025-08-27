//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/client/echo';

import { not_meta } from '../meta';

import { Transcript } from './Transcript';

/**
 * Endpoint to the calls service.
 */
export class Create extends Schema.TaggedClass<Create>()(`${not_meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    space: SpaceSchema,
  }),
  output: Schema.Struct({
    object: Transcript,
  }),
}) {}
