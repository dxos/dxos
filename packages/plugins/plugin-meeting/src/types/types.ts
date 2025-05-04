//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { DocumentType } from '@dxos/plugin-markdown/types';

import { MeetingType } from './schema';
import { MEETING_PLUGIN } from '../meta';
import { type MediaState, type CallState } from '../state';

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

// TODO(budron): Better way to define specific extensions for meeting companions.
// TODO(budron): This brings in deps from ../state; how should we manage/minimize explicit type exposure to other plugins?
export type MeetingCallProperties = {
  onJoin: (state: { meeting: MeetingType; roomId: string }) => Promise<void>;
  onLeave: () => Promise<void>;
  onCallStateUpdated: (callState: CallState) => Promise<void>;
  onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;

  // TODO(dmaretskyi): What are the other properties?
  [key: string]: any;
};
