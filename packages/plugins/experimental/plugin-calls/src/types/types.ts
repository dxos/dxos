//
// Copyright 2023 DXOS.org
//

import { isInstanceOf, S } from '@dxos/echo-schema';
import { type Space, isReactiveObject, isSpace } from '@dxos/react-client/echo';

import { TranscriptSchema, TranscriptType } from './transcript';
import { CALLS_PLUGIN } from '../meta';

/**
 * Endpoint to the calls service.
 */
export const CALLS_URL = 'https://calls-service.dxos.workers.dev';

export namespace CallsAction {
  const CALLS_ACTION = `${CALLS_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CALLS_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TranscriptSchema,
    }),
  }) {}
}

export type Call = {
  type: string;
  space: Space;
};

export const isCall = (data: any): data is Call => data.type === `${CALLS_PLUGIN}/space` && isSpace(data.space);

export const isTranscript = (object: unknown): object is typeof TranscriptType => {
  return isReactiveObject(object) && isInstanceOf(TranscriptType, object);
};
