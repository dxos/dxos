//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { Transcript } from '@dxos/types';

import { meta } from '../meta';

/**
 * Endpoint to the calls service.
 */
export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    space: SpaceSchema,
  }),
  output: Schema.Struct({
    object: Transcript.Transcript,
  }),
}) {}
