//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as TestClock from 'effect/testing/TestClock';

import { type Context } from '@dxos/context';
import { EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import { EdgeCallFailedError } from '@dxos/protocols';

import { UNAVAILABLE_BACKOFF_MS, makeEdgeAgentMailbox } from './agent-mailbox.ts';

type RecordedRequest = { path: string } & EdgeRequestArgs;

/** Records each request and answers with a canned body, standing in for EDGE's mailbox route. */
class MockEdgeHttpClient extends EdgeHttpClient {
  readonly requests: RecordedRequest[] = [];

  constructor(private _response: unknown) {
    super('http://edge.test');
  }

  /** Answers later requests with `response`; an error is thrown, as the client throws a failed call. */
  respond(response: unknown) {
    this._response = response;
  }

  override async request(_ctx: Context, path: string, args: EdgeRequestArgs): Promise<unknown> {
    this.requests.push({ path, ...args });
    if (this._response instanceof Error) {
      throw this._response;
    }
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
      expect(yield* mailbox.status('kai')).toEqual(Option.some(STATUS));
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
      expect(error.message).toBe('Unexpected mailbox answer from EDGE.');
    }),
  );

  it.effect('a 404 reads as no mailbox and backs off instead of polling EDGE', ({ expect }) =>
    Effect.gen(function* () {
      const edge = new MockEdgeHttpClient(
        new EdgeCallFailedError({ message: 'HTTP code 404: Not Found.', status: 404 }),
      );
      const mailbox = makeEdgeAgentMailbox(edge);

      expect(yield* mailbox.status('kai')).toEqual(Option.none());
      // Reads inside the backoff answer from the last 404 without a request.
      yield* TestClock.adjust(UNAVAILABLE_BACKOFF_MS - 1);
      expect(yield* mailbox.status('kai')).toEqual(Option.none());
      expect(edge.requests).toHaveLength(1);

      // The next 404 doubles the wait.
      yield* TestClock.adjust(1);
      expect(yield* mailbox.status('kai')).toEqual(Option.none());
      expect(edge.requests).toHaveLength(2);
      yield* TestClock.adjust(2 * UNAVAILABLE_BACKOFF_MS - 1);
      yield* mailbox.status('kai');
      expect(edge.requests).toHaveLength(2);

      // Once EDGE serves the mailbox, reads go through on every call again.
      edge.respond(STATUS);
      yield* TestClock.adjust(1);
      expect(yield* mailbox.status('kai')).toEqual(Option.some(STATUS));
      expect(yield* mailbox.status('kai')).toEqual(Option.some(STATUS));
      expect(edge.requests).toHaveLength(4);
    }),
  );

  it.effect('a failure other than 404 is still an error', ({ expect }) =>
    Effect.gen(function* () {
      const edge = new MockEdgeHttpClient(new EdgeCallFailedError({ message: 'HTTP code 500.', status: 500 }));
      const error = yield* Effect.flip(makeEdgeAgentMailbox(edge).status('kai'));
      expect(error.message).toBe('HTTP code 500.');
    }),
  );
});
