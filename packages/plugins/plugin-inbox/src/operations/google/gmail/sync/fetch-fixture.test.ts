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

import { inboxSyncLiveServices, seedMailboxBinding } from '../../../../testing/sync-fixture';
import { runGmailSync } from './sync';

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
        const { db, mailbox, connection, binding } = await seedMailboxBinding(builder, { token: ACCESS_TOKEN! });

        const messages = await EffectEx.runPromise(
          Effect.gen(function* () {
            yield* runGmailSync({
              binding: Ref.make(binding),
              ...(process.env.FETCH_AFTER ? { after: process.env.FETCH_AFTER } : {}),
            });
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
