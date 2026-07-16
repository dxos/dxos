//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, test } from 'vitest';

import { Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { inboxSyncLiveServices, runGoogleSync, seedMailboxBinding } from '../../../../testing/sync-fixture';

const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
const FIXTURE_OUT = process.env.FIXTURE_OUT;

/**
 * The fixture-fetch tool (see scripts/google-auth.mjs + scripts/fetch-fixture.mjs): syncs a real
 * Gmail account in-process against the live API and writes the exported feed to FIXTURE_OUT. Skipped
 * unless GOOGLE_ACCESS_TOKEN + FIXTURE_OUT are set — it is a manual tool, never a CI unit test.
 */
describe.skipIf(!ACCESS_TOKEN || !FIXTURE_OUT)('fetch mailbox fixture from live Gmail', () => {
  test(
    'syncs the account and writes the exported feed to FIXTURE_OUT',
    async () => {
      const builder = await new EchoTestBuilder().open();
      try {
        // The sync op takes a day-count horizon, but an absolute date reads better for a manual pull —
        // accept `FETCH_AFTER=yyyy-mm-dd` and translate to days-back (at least one). Fail loudly on an
        // unparseable date rather than letting `NaN` flow through.
        const fetchAfter = process.env.FETCH_AFTER;
        const afterMs = fetchAfter ? Date.parse(fetchAfter) : Number.NaN;
        if (fetchAfter && Number.isNaN(afterMs)) {
          throw new Error(`Invalid FETCH_AFTER date: "${fetchAfter}" (expected yyyy-mm-dd)`);
        }
        const syncBackDays = fetchAfter ? Math.max(1, Math.ceil((Date.now() - afterMs) / 86_400_000)) : undefined;
        const { db, mailbox, connection, binding } = await seedMailboxBinding(builder, {
          token: ACCESS_TOKEN!,
          ...(syncBackDays !== undefined ? { options: { syncBackDays } } : {}),
        });

        const messages = await EffectEx.runPromise(
          Effect.gen(function* () {
            yield* runGoogleSync({ binding: Ref.make(binding) });
            const feedUri = Feed.getFeedUri(mailbox.feed.target!)!;
            return yield* Effect.promise(() =>
              db.query(Query.select(Filter.type(Message.Message)).from(Scope.feed(feedUri))).run(),
            );
          }).pipe(Effect.provide(inboxSyncLiveServices(db, Ref.make(connection)))),
        );

        const serialized = messages.map((message) => Obj.toJSON(message));
        mkdirSync(dirname(FIXTURE_OUT!), { recursive: true });
        writeFileSync(FIXTURE_OUT!, JSON.stringify(serialized, null, 2));
        log.info('wrote mailbox fixture', { path: FIXTURE_OUT, messages: serialized.length });
      } finally {
        await builder.close();
      }
    },
    10 * 60_000,
  );
});
