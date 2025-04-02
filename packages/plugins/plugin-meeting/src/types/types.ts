//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { MeetingSchema, MeetingType } from './schema';
import { MEETING_PLUGIN } from '../meta';

export namespace MeetingAction {
  const MEETING_ACTION = `${MEETING_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${MEETING_ACTION}/create`, {
    input: MeetingSchema,
    output: S.Struct({
      object: MeetingType,
    }),
  }) {}
}
