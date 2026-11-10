//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { type EdgeRequestArgs } from '@dxos/edge-client/http';

import { CallsServiceClient } from './calls-service-client.ts';

type Request = { route: string; body?: unknown };

/** A fake EDGE answering calls-service's proxy by `METHOD path`; an unrouted call throws, as its 404 would. */
const fakeEdge = (answers: Record<string, unknown>) => {
  const requests: Request[] = [];
  const client = new CallsServiceClient({
    request: async (_ctx: Context, path: string, { method, body }: EdgeRequestArgs) => {
      const route = `${method} ${path.replace(/^\/calls\/realtimekit/, '')}`;
      requests.push({ route, body });
      if (!(route in answers)) {
        throw new Error(`unrouted ${route}`);
      }
      return answers[route];
    },
  });
  return { client, requests };
};

const ctx = Context.default();

describe('CallsServiceClient', () => {
  test('a first joiner creates the room meeting and adds itself', async ({ expect }) => {
    const { client, requests } = fakeEdge({
      'GET /meetings?search=echo%3A%2Froom&status=ACTIVE&per_page=50': [{ id: 'other', title: 'echo:/room/child' }],
      'POST /meetings': { id: 'meeting-1', title: 'echo:/room' },
      'GET /meetings/meeting-1/participants?page_no=1&per_page=100': [],
      'POST /meetings/meeting-1/participants': { id: 'participant-1', token: 'auth-token' },
    });

    expect(await client.joinCallRoom(ctx, { roomId: 'echo:/room', deviceKey: 'device' })).toEqual({
      meetingId: 'meeting-1',
      authToken: 'auth-token',
    });
    expect(requests.find(({ route }) => route === 'POST /meetings')?.body).toEqual({ title: 'echo:/room' });
    expect(requests.at(-1)?.body).toEqual({ custom_participant_id: 'device' });
  });

  test('joiners without a meeting id converge on the oldest meeting with the title', async ({ expect }) => {
    const { client, requests } = fakeEdge({
      'GET /meetings?search=echo%3A%2Froom&status=ACTIVE&per_page=50': [
        { id: 'newer', title: 'echo:/room', created_at: '2026-11-10T10:00:01Z' },
        { id: 'older', title: 'echo:/room', created_at: '2026-11-10T10:00:00Z' },
      ],
      'GET /meetings/older/participants?page_no=1&per_page=100': [],
      'POST /meetings/older/participants': { id: 'participant-1', token: 'auth-token' },
    });

    expect((await client.joinCallRoom(ctx, { roomId: 'echo:/room', deviceKey: 'device' })).meetingId).toBe('older');
    expect(requests.some(({ route }) => route === 'POST /meetings')).toBe(false);
  });

  test('a returning participant refreshes its token rather than adding another', async ({ expect }) => {
    const { client, requests } = fakeEdge({
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
      await client.joinCallRoom(ctx, { roomId: 'echo:/room', meetingId: 'meeting-1', deviceKey: 'device' }),
    ).toEqual({ meetingId: 'meeting-1', authToken: 'refreshed-token' });
    expect(requests.some(({ route }) => route === 'POST /meetings/meeting-1/participants')).toBe(false);
  });

  test('an identity transcribes in its own meeting', async ({ expect }) => {
    const { client } = fakeEdge({
      'GET /meetings?search=transcription%3Adid%3Ahalo%3Aabc&status=ACTIVE&per_page=50': [
        { id: 'solo', title: 'transcription:did:halo:abc' },
      ],
      'GET /meetings/solo/participants?page_no=1&per_page=100': [],
      'POST /meetings/solo/participants': { id: 'participant-1', token: 'solo-token' },
    });

    expect(await client.joinTranscription(ctx, 'did:halo:abc')).toEqual({ meetingId: 'solo', authToken: 'solo-token' });
  });

  test('an answer of the wrong shape fails the join', async ({ expect }) => {
    const { client } = fakeEdge({ 'GET /meetings?search=room&status=ACTIVE&per_page=50': { not: 'a list' } });
    await expect(client.joinCallRoom(ctx, { roomId: 'room', deviceKey: 'device' })).rejects.toThrow();
  });
});
