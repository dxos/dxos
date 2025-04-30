//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { DocumentType } from '@dxos/plugin-markdown/types';

import { MeetingType } from './schema';
import { MEETING_PLUGIN } from '../meta';

export namespace MeetingAction {
  const MEETING_ACTION = `${MEETING_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${MEETING_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: MeetingType,
    }),
  }) {}

  export class Summarize extends S.TaggedClass<Summarize>()(`${MEETING_ACTION}/summarize`, {
    input: S.Struct({
      meeting: MeetingType,
    }),
    output: S.Struct({
      object: DocumentType,
    }),
  }) {}
}
