//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceId } from '@dxos/keys';

import { not_meta } from '../meta';

import { Transcript } from './Transcript';

/**
 * Endpoint to the calls service.
 */
export class Create extends Schema.TaggedClass<Create>()(`${not_meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    spaceId: SpaceId,
  }),
  output: Schema.Struct({
    object: Transcript,
  }),
}) {}
