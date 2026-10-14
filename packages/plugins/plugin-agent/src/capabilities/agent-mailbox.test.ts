//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { type Context } from '@dxos/context';
import { EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';

import { makeEdgeAgentMailbox } from './agent-mailbox.ts';

type RecordedRequest = { path: string } & EdgeRequestArgs;

/** Records each request and answers with a canned body, standing in for EDGE's mailbox route. */
class MockEdgeHttpClient extends EdgeHttpClient {
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly _response: unknown) {
    super('http://edge.test');
  }

  override async request(_ctx: Context, path: string, args: EdgeRequestArgs): Promise<unknown> {
    this.requests.push({ path, ...args });
    return this._response;
  }
}

const STATUS = { handle: 'kai', address: 'kai@dxos.ai', threads: 0, pending: 0, received: 0, rejected: 0, sent: 0 };

describe('EDGE agent mailbox', () => {
  it.effect('claims, reads and releases through the mailbox route', ({ expect }) =>
    Effect.gen(function* () {
      const edge = new MockEdgeHttpClient(STATUS);
      const mailbox = makeEdgeAgentMailbox(edge);
      yield* mailbox.claim({
        handle: 'kai',
        spaceId: 'SPACE',
        agent: 'echo://SPACE/agent',
        channel: 'echo://SPACE/channel',
        allowedSenders: ['dxos.org'],
      });
      expect(yield* mailbox.status('kai')).toEqual(STATUS);
      yield* mailbox.release('kai');
      expect(edge.requests).toEqual([
        {
          path: '/compute/email/mailboxes/kai',
          method: 'PUT',
          body: {
            spaceId: 'SPACE',
            agent: 'echo://SPACE/agent',
            channel: 'echo://SPACE/channel',
            allowedSenders: ['dxos.org'],
          },
        },
        { path: '/compute/email/mailboxes/kai', method: 'GET' },
        { path: '/compute/email/mailboxes/kai', method: 'DELETE' },
      ]);
    }),
  );

  it.effect('an answer that is not a mailbox status fails with the mailbox error', ({ expect }) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(makeEdgeAgentMailbox(new MockEdgeHttpClient({ nope: true })).status('kai'));
      expect(error.message).toBe('Unexpected mailbox status from EDGE.');
    }),
  );
});
