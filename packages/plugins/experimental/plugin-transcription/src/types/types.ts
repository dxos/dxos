//
// Copyright 2025 DXOS.org
//

import { S, isInstanceOf } from '@dxos/echo-schema';
import { type buf } from '@dxos/protocols/buf';
import { type TranscriptionSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { isReactiveObject } from '@dxos/react-client/echo';

import { TranscriptSchema, TranscriptType } from './schema';
import { TRANSCRIPTION_PLUGIN } from '../meta';

// TODO(burdon): Move to separate proto.
export type TranscriptionState = buf.MessageInitShape<typeof TranscriptionSchema>;

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
    }),
    output: S.Struct({
      object: TranscriptSchema,
    }),
  }) {}
}

export const isTranscript = (object: unknown): object is typeof TranscriptType => {
  return isReactiveObject(object) && isInstanceOf(TranscriptType, object);
};
