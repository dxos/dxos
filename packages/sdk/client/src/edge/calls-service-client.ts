//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client/http';

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

/**
 * Client for EDGE's calls-service, which proxies the RealtimeKit REST API (`<edge>/calls/realtimekit/*`) and adds the
 * API token, our preset and a short token lifetime. It finds, creates and joins meetings; which meeting a room uses is
 * agreed over the swarm.
 */
export class CallsServiceClient {
  #edgeClient: Pick<EdgeHttpClient, 'request'>;

  constructor(edgeClient: Pick<EdgeHttpClient, 'request'>) {
    this.#edgeClient = edgeClient;
  }

  /**
   * Joins a call room's meeting as this device: the meeting the swarm agreed on when given, else the oldest active
   * meeting titled after the room, created when there is none, so joiners that raced to an empty room converge.
   */
  async joinCallRoom(ctx: Context, { roomId, meetingId, deviceKey }: JoinCallRoomRequest): Promise<JoinCallResponse> {
    const id = meetingId ?? (await this.#findOrCreateMeeting(ctx, roomId));
    return { meetingId: id, authToken: await this.#mintParticipantToken(ctx, id, deviceKey) };
  }

  /** Joins the identity's one-person meeting, where live transcription runs with nobody else in the room. */
  async joinTranscription(ctx: Context, identityDid: string): Promise<JoinCallResponse> {
    const meetingId = await this.#findOrCreateMeeting(ctx, `transcription:${identityDid}`);
    return { meetingId, authToken: await this.#mintParticipantToken(ctx, meetingId, identityDid) };
  }

  async #findOrCreateMeeting(ctx: Context, title: string): Promise<string> {
    const query = new URLSearchParams({ search: title, status: 'ACTIVE', per_page: '50' });
    const meetings = await this.#call(ctx, Schema.Array(Meeting), 'GET', `/meetings?${query}`);
    const [oldest] = meetings
      .filter((meeting) => meeting.title === title)
      .toSorted((left, right) => (left.created_at ?? '').localeCompare(right.created_at ?? ''));
    return oldest?.id ?? (await this.#call(ctx, Meeting, 'POST', '/meetings', { title })).id;
  }

  /**
   * RealtimeKit expects one participant per user per meeting, reused across sessions, so a returning participant gets a
   * fresh token rather than a second roster entry with the same id.
   */
  async #mintParticipantToken(ctx: Context, meetingId: string, participantId: string): Promise<string> {
    const meeting = `/meetings/${encodeURIComponent(meetingId)}`;
    const existing = await this.#findParticipant(ctx, meeting, participantId);
    const { token } = existing
      ? await this.#call(ctx, Token, 'POST', `${meeting}/participants/${encodeURIComponent(existing)}/token`, {})
      : await this.#call(ctx, Token, 'POST', `${meeting}/participants`, { custom_participant_id: participantId });
    return token;
  }

  async #findParticipant(ctx: Context, meeting: string, participantId: string): Promise<string | undefined> {
    for (let page = 1; page <= MAX_PARTICIPANT_PAGES; page++) {
      const query = new URLSearchParams({ page_no: String(page), per_page: String(PARTICIPANTS_PAGE_SIZE) });
      const participants = await this.#call(ctx, Schema.Array(Participant), 'GET', `${meeting}/participants?${query}`);
      const match = participants.find((participant) => participant.custom_participant_id === participantId);
      if (match || participants.length < PARTICIPANTS_PAGE_SIZE) {
        return match?.id;
      }
    }
    return undefined;
  }

  async #call<S extends Schema.ConstraintDecoder<unknown>>(
    ctx: Context,
    schema: S,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<S['Type']> {
    const data = await this.#edgeClient.request(ctx, `/calls/realtimekit${path}`, { method, body });
    return Schema.decodeUnknownSync(schema)(data);
  }
}
