//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema, type TranscriptionPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import * as Meeting from './Meeting.ts';

/** The meeting a call is for, shared over the call's swarm under {@link meetingKey}. */
export type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

/** Whether the call's transcript is being kept, shared over the call's swarm under {@link TRANSCRIPTION_KEY}. */
export type TranscriptionPayload = buf.MessageInitShape<typeof TranscriptionPayloadSchema>;

/**
 * Activity key of the transcription flag. Separate from the meeting's key so either can be written without reading
 * the other: both are last-write-wins, and one shared value made a meeting switch race a transcription toggle.
 */
export const TRANSCRIPTION_KEY = 'org.dxos.plugin.meeting.transcription';

/** Activity key of the call's meeting: the Meeting typename. */
export const meetingKey = (): string => {
  const typename = Type.getTypename(Meeting.Meeting);
  invariant(typename, 'Meeting has no typename');
  return typename;
};

/** Reads the transcription flag from its activity's payload; absent means off. */
export const isTranscriptionEnabled = (activity: { payload?: { enabled?: unknown } } | undefined): boolean =>
  activity?.payload?.enabled === true;
