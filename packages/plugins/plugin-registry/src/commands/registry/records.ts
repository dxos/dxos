//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

import { type ListRecordsEntry, ALL_NSIDS, AUTH_OPTION_DESCRIPTIONS, listRecords, resolveSession } from './util';

/**
 * `dx registry records` — lists all `org.dxos.experimental.*` records on the
 * authenticated user's repo. Useful for double-checking what's been published
 * and what the registry indexer is about to ingest.
 */
export const records = Command.make(
  'records',
  {
    handle: Options.text('handle').pipe(Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle), Options.optional),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const { json } = yield* CommandConfig;
        const client = yield* ClientService;
        const session = yield* resolveSession({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
          client,
        });

        // Issue listRecords against each of the four registry collections in
        // parallel. The repo is tiny so the four-fan-out is fine.
        const results = yield* Effect.all(
          ALL_NSIDS.map((collection) =>
            listRecords(session, collection).pipe(
              Effect.map(({ records: entries }) => ({ collection, records: entries })),
              // Empty collections come back as a 200 with `records: []`; if the
              // PDS responds 400 because we've never written that collection we
              // still want the others to render.
              Effect.catchAll(() => Effect.succeed({ collection, records: [] as readonly ListRecordsEntry[] })),
            ),
          ),
          { concurrency: 'unbounded' },
        );

        if (json) {
          yield* Console.log(JSON.stringify({ did: session.did, results }, null, 2));
          return;
        }

        yield* Console.log(`Repo: ${session.did} (${session.handle})`);
        for (const { collection, records: entries } of results) {
          yield* Console.log(`\n${collection} (${entries.length})`);
          for (const entry of entries) {
            yield* Console.log(`  ${entry.uri}`);
          }
        }
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription("List org.dxos.experimental.* records on the authenticated user's repo."));
