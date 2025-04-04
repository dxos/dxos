//
// Copyright 2025 DXOS.org
//

import { S, isInstanceOf } from '@dxos/echo-schema';
import { isReactiveObject } from '@dxos/react-client/echo';

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
      // TODO(wittjosiah): SpaceId.
      spaceId: S.String,
    }),
    output: S.Struct({
      object: TranscriptType,
    }),
  }) {}

  export class Summarize extends S.TaggedClass<Summarize>()(`${TRANSCRIPTION_ACTION}/summarize`, {
    input: S.Struct({
      transcript: TranscriptType,
      context: S.optional(S.String),
    }),
    output: S.String,
  }) {}
}

export const isTranscript = (object: unknown): object is typeof TranscriptType => {
  return isReactiveObject(object) && isInstanceOf(TranscriptType, object);
};
