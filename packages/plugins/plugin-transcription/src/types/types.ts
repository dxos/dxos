//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceId } from '@dxos/react-client/echo';

import { TRANSCRIPTION_PLUGIN } from '../meta';

import { TranscriptType } from './schema';

// TODO(burdon): Move to separate proto.

/**
 * Endpoint to the calls service.
 */
// TODO(burdon): Reconfigure/move.
export const TRANSCRIPTION_URL = 'https://calls-service.dxos.workers.dev';

export namespace TranscriptionAction {
  const TRANSCRIPTION_ACTION = `${TRANSCRIPTION_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${TRANSCRIPTION_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      spaceId: SpaceId,
    }),
    output: Schema.Struct({
      object: TranscriptType,
    }),
  }) {}
}
