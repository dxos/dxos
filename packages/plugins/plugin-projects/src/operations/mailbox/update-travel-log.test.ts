//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Ref } from '@dxos/echo';

import { artifactContents, makeMessage, seed, testLayer } from './testing.ts';
import updateTravelLog from './update-travel-log.ts';

describe('update-travel-log', () => {
  it.effect('regenerates the bookings document from travel mail', () =>
    Effect.gen(function* () {
      const { db, feed, mailbox, project } = yield* seed([
        { email: 'noreply@united.com', subject: 'Your flight confirmation UA123' },
        { email: 'reservations@hotelchain.com', subject: 'Hotel reservation confirmed' },
        { email: 'alice@example.com', subject: 'Lunch?' },
      ]);

      const first = yield* updateTravelLog.handler({ project: Ref.make(project), mailbox: Ref.make(mailbox) });
      expect(first).toMatchObject({ scanned: 3, matched: 2 });
      const contents = yield* artifactContents(project, 'Travel Bookings');
      expect(contents).toHaveLength(1);
      expect(contents[0]).toContain('UA123');
      expect(contents[0]).toContain('Hotel reservation confirmed');
      expect(contents[0]).not.toContain('Lunch?');

      yield* Effect.promise(() =>
        db.appendToFeed(feed, [makeMessage({ email: 'noreply@delta.com', subject: 'Itinerary DL42' }, 9)]),
      );
      const rerun = yield* updateTravelLog.handler({ project: Ref.make(project), mailbox: Ref.make(mailbox) });
      expect(rerun.matched).toBe(3);
      const updated = yield* artifactContents(project, 'Travel Bookings');
      expect(updated).toHaveLength(1);
      expect(updated[0]).toContain('DL42');
    }).pipe(Effect.provide(testLayer())),
  );
});
