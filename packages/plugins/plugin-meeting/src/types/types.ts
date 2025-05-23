//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DocumentType } from '@dxos/plugin-markdown/types';

import { MeetingType } from './schema';
import { MEETING_PLUGIN } from '../meta';
import { type MediaState, type CallState } from '../state';

export namespace MeetingAction {
  const MEETING_ACTION = `${MEETING_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${MEETING_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: MeetingType,
    }),
  }) {}

  export class Summarize extends Schema.TaggedClass<Summarize>()(`${MEETING_ACTION}/summarize`, {
    input: Schema.Struct({
      meeting: MeetingType,
    }),
    output: Schema.Struct({
      object: DocumentType,
    }),
  }) {}
}

// TODO(budron): Better way to define specific extensions for meeting companions.
// TODO(budron): This brings in deps from ../state; how should we manage/minimize explicit type exposure to other plugins?
export type MeetingCallProperties = {
  onJoin: (state: { meeting?: MeetingType; roomId?: string }) => Promise<void>;
  onLeave: (roomId?: string) => Promise<void>;
  onCallStateUpdated: (callState: CallState) => Promise<void>;
  onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;

  // TODO(dmaretskyi): What are the other properties?
  [key: string]: any;
};
