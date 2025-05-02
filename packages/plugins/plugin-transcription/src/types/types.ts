//
// Copyright 2025 DXOS.org
//

import { S, isInstanceOf, SpaceIdSchema } from '@dxos/echo-schema';
import { isLiveObject } from '@dxos/react-client/echo';

import { TranscriptType } from './schema';
import { TRANSCRIPTION_PLUGIN } from '../meta';

// TODO(burdon): Move to separate proto.

/**
 * Endpoint to the calls service.
 */
// TODO(burdon): Reconfigure/move.
export const TRANSCRIPTION_URL = 'https://calls-service.dxos.workers.dev';

export namespace TranscriptionAction {
  const TRANSCRIPTION_ACTION = `${TRANSCRIPTION_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${TRANSCRIPTION_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
      spaceId: SpaceIdSchema,
    }),
    output: S.Struct({
      object: TranscriptType,
    }),
  }) {}
}

export const isTranscript = (object: unknown): object is typeof TranscriptType => {
  return isLiveObject(object) && isInstanceOf(TranscriptType, object);
};

export const TranscriptionSettingsSchema = S.mutable(
  S.Struct({
    entityExtraction: S.optional(S.Boolean),
  }),
);

export type TranscriptionSettingsProps = S.Schema.Type<typeof TranscriptionSettingsSchema>;
