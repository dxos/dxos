//
// Copyright 2025 DXOS.org
//

import { S, isInstanceOf } from '@dxos/echo-schema';
import { DocumentSchema } from '@dxos/plugin-markdown/types';
import { isReactiveObject } from '@dxos/react-client/echo';

import { TranscriptSchema, TranscriptType } from './schema';
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
    }),
    output: S.Struct({
      object: TranscriptSchema,
    }),
  }) {}

  export class Summarize extends S.TaggedClass<Summarize>()(`${TRANSCRIPTION_ACTION}/summarize`, {
    input: S.Struct({
      object: TranscriptSchema,
    }),
    output: S.Struct({
      object: DocumentSchema,
    }),
  }) {}
}

export const isTranscript = (object: unknown): object is typeof TranscriptType => {
  return isReactiveObject(object) && isInstanceOf(TranscriptType, object);
};
