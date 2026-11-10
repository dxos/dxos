//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';

import {
  type RealtimeKitCall,
  joinCallRoom,
  joinRealtimeKitMeeting,
  transcriptionMeetingTitle,
} from './realtime-kit.ts';

type Request = { route: string; body?: unknown };

/** A fake proxy answering by `METHOD path`; an unrouted call throws, as calls-service's 404 would. */
const fakeProxy = (answers: Record<string, unknown>) => {
  const requests: Request[] = [];
  const call: RealtimeKitCall = async (method, path, body) => {
    const route = `${method} ${path}`;
    requests.push({ route, body });
    if (!(route in answers)) {
      throw new Error(`unrouted ${route}`);
    }
    return answers[route];
  };
  return { call, requests };
};

describe('joinRealtimeKitMeeting', () => {
  test('a first joiner creates the room meeting and adds itself', async ({ expect }) => {
    const { call, requests } = fakeProxy({
      'GET /meetings?search=echo%3A%2Froom&status=ACTIVE&per_page=50': [{ id: 'other', title: 'echo:/room/child' }],
      'POST /meetings': { id: 'meeting-1', title: 'echo:/room' },
      'GET /meetings/meeting-1/participants?page_no=1&per_page=100': [],
      'POST /meetings/meeting-1/participants': { id: 'participant-1', token: 'auth-token' },
    });

    expect(await joinRealtimeKitMeeting(call, { title: 'echo:/room', participantId: 'device' })).toEqual({
      meetingId: 'meeting-1',
      authToken: 'auth-token',
    });
    expect(requests.find(({ route }) => route === 'POST /meetings')?.body).toEqual({ title: 'echo:/room' });
    expect(requests.at(-1)?.body).toEqual({ custom_participant_id: 'device' });
  });

  test('joiners without a meeting id converge on the oldest meeting with the title', async ({ expect }) => {
    const { call, requests } = fakeProxy({
      'GET /meetings?search=echo%3A%2Froom&status=ACTIVE&per_page=50': [
        { id: 'newer', title: 'echo:/room', created_at: '2026-11-10T10:00:01Z' },
        { id: 'older', title: 'echo:/room', created_at: '2026-11-10T10:00:00Z' },
      ],
      'GET /meetings/older/participants?page_no=1&per_page=100': [],
      'POST /meetings/older/participants': { id: 'participant-1', token: 'auth-token' },
    });

    expect((await joinRealtimeKitMeeting(call, { title: 'echo:/room', participantId: 'device' })).meetingId).toBe(
      'older',
    );
    expect(requests.some(({ route }) => route === 'POST /meetings')).toBe(false);
  });

  test('a returning participant refreshes its token rather than adding another', async ({ expect }) => {
    const { call, requests } = fakeProxy({
      'GET /meetings/meeting-1/participants?page_no=1&per_page=100': Array.from({ length: 100 }, (_, index) => ({
        id: `p-${index}`,
        custom_participant_id: `d-${index}`,
      })),
      'GET /meetings/meeting-1/participants?page_no=2&per_page=100': [
        { id: 'participant-1', custom_participant_id: 'device' },
      ],
      'POST /meetings/meeting-1/participants/participant-1/token': { token: 'refreshed-token' },
    });

    expect(
      await joinRealtimeKitMeeting(call, { meetingId: 'meeting-1', title: 'echo:/room', participantId: 'device' }),
    ).toEqual({ meetingId: 'meeting-1', authToken: 'refreshed-token' });
    expect(requests.some(({ route }) => route === 'POST /meetings/meeting-1/participants')).toBe(false);
  });

  test('an identity transcribes in its own meeting', async ({ expect }) => {
    const title = transcriptionMeetingTitle('did:halo:abc');
    const { call } = fakeProxy({
      'GET /meetings?search=transcription%3Adid%3Ahalo%3Aabc&status=ACTIVE&per_page=50': [{ id: 'solo', title }],
      'GET /meetings/solo/participants?page_no=1&per_page=100': [],
      'POST /meetings/solo/participants': { id: 'participant-1', token: 'solo-token' },
    });

    expect(await joinRealtimeKitMeeting(call, { title, participantId: 'did:halo:abc' })).toEqual({
      meetingId: 'solo',
      authToken: 'solo-token',
    });
  });

  test('an answer of the wrong shape fails the join', async ({ expect }) => {
    const { call } = fakeProxy({ 'GET /meetings?search=room&status=ACTIVE&per_page=50': { not: 'a list' } });
    await expect(joinRealtimeKitMeeting(call, { title: 'room', participantId: 'device' })).rejects.toThrow();
  });

  test("joinCallRoom goes through calls-service's RealtimeKit proxy", async ({ expect }) => {
    const paths: string[] = [];
    const answers: Record<string, unknown> = {
      '/calls/realtimekit/meetings/meeting-1/participants?page_no=1&per_page=100': [],
      '/calls/realtimekit/meetings/meeting-1/participants': { id: 'participant-1', token: 'auth-token' },
    };
    const edge = {
      request: async (_ctx: Context, path: string) => {
        paths.push(path);
        return answers[path];
      },
    };

    expect(
      await joinCallRoom(edge, Context.default(), {
        roomId: 'echo:/room',
        meetingId: 'meeting-1',
        deviceKey: 'device',
      }),
    ).toEqual({ meetingId: 'meeting-1', authToken: 'auth-token' });
    expect(paths).toEqual(Object.keys(answers));
  });
});
