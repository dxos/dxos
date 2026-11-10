//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * One call to calls-service's RealtimeKit proxy (`<edge>/calls/realtimekit/*`), which adds the API token; resolves to
 * the answer's `data`.
 */
export type RealtimeKitCall = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;

/** What a device needs to join a call room's RealtimeKit meeting. */
export type JoinCallRoomRequest = {
  /** DXN of the object anchoring the call (e.g. a Meeting); also the swarm room id and the meeting title. */
  roomId: string;
  /** RealtimeKit meeting id the swarm already agreed on; the first joiner omits it. */
  meetingId?: string;
  /** The joining device's key (== swarm `UserState.id`), which peers key its tracks by. */
  deviceKey: string;
};

export type JoinCallResponse = {
  /** RealtimeKit meeting id; for a room, what the joiner advertises to the swarm. */
  meetingId: string;
  /** Participant token for `RealtimeKitClient.init`, short-lived. */
  authToken: string;
};

const Meeting = Schema.Struct({
  id: Schema.String,
  title: Schema.optional(Schema.String),
  created_at: Schema.optional(Schema.String),
});
const Participant = Schema.Struct({ id: Schema.String, custom_participant_id: Schema.optional(Schema.String) });
const Token = Schema.Struct({ token: Schema.String });

/** Participants fetched per page when looking one up. */
const PARTICIPANTS_PAGE_SIZE = 100;

/** Upper bound on participant pages scanned, so a pathological meeting cannot stall a join. */
const MAX_PARTICIPANT_PAGES = 10;

/** Title of an identity's transcription meeting: one per identity, reused by every session its devices start. */
export const transcriptionMeetingTitle = (identityDid: string): string => `transcription:${identityDid}`;

/**
 * Joins a RealtimeKit meeting as `participantId`: the meeting the swarm agreed on when given, else the oldest active
 * meeting titled `title`, created when there is none, so joiners that raced to an empty room converge afterwards.
 */
export const joinRealtimeKitMeeting = async (
  call: RealtimeKitCall,
  { meetingId, title, participantId }: { meetingId?: string; title: string; participantId: string },
): Promise<JoinCallResponse> => {
  const id = meetingId ?? (await findOrCreateMeeting(call, title));
  return { meetingId: id, authToken: await mintParticipantToken(call, id, participantId) };
};

const findOrCreateMeeting = async (call: RealtimeKitCall, title: string): Promise<string> => {
  const query = new URLSearchParams({ search: title, status: 'ACTIVE', per_page: '50' });
  const meetings = Schema.decodeUnknownSync(Schema.Array(Meeting))(await call('GET', `/meetings?${query}`));
  const [oldest] = meetings
    .filter((meeting) => meeting.title === title)
    .toSorted((left, right) => (left.created_at ?? '').localeCompare(right.created_at ?? ''));
  return oldest?.id ?? Schema.decodeUnknownSync(Meeting)(await call('POST', '/meetings', { title })).id;
};

/**
 * RealtimeKit expects one participant per user per meeting, reused across sessions, so a returning participant gets a
 * fresh token rather than a second roster entry with the same id. calls-service names it and sets its preset and expiry.
 */
const mintParticipantToken = async (call: RealtimeKitCall, meetingId: string, participantId: string) => {
  const meeting = `/meetings/${encodeURIComponent(meetingId)}`;
  const existing = await findParticipant(call, meeting, participantId);
  const answer = existing
    ? await call('POST', `${meeting}/participants/${encodeURIComponent(existing)}/token`, {})
    : await call('POST', `${meeting}/participants`, { custom_participant_id: participantId });
  return Schema.decodeUnknownSync(Token)(answer).token;
};

const findParticipant = async (call: RealtimeKitCall, meeting: string, participantId: string) => {
  for (let page = 1; page <= MAX_PARTICIPANT_PAGES; page++) {
    const query = new URLSearchParams({ page_no: String(page), per_page: String(PARTICIPANTS_PAGE_SIZE) });
    const participants = Schema.decodeUnknownSync(Schema.Array(Participant))(
      await call('GET', `${meeting}/participants?${query}`),
    );
    const match = participants.find((participant) => participant.custom_participant_id === participantId);
    if (match || participants.length < PARTICIPANTS_PAGE_SIZE) {
      return match?.id;
    }
  }
  return undefined;
};
