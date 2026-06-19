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

import { ClientService } from '@dxos/client';

import { AUTH_OPTION_DESCRIPTIONS, NSID, deleteRecord, listRecords, resolveSession } from './util';

const rkeyOf = (uri: string): string => uri.split('/').pop() ?? '';

/**
 * `dx registry unpublish` — removes a package from the authenticated user's PDS:
 * deletes the `package.profile` (rkey = key) and every `package.release`
 * (rkey = `<key>:<version>`). The registry indexer unindexes on its next sweep.
 * Hosted bundles in edge R2 are immutable and are not removed.
 */
export const unpublish = Command.make(
  'unpublish',
  {
    handle: Options.text('handle').pipe(Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle), Options.optional),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    key: Options.text('key').pipe(
      Options.withDescription('Package key (the profile rkey). Removes its profile and all releases.'),
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const client = yield* ClientService;
        const session = yield* resolveSession({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
          client,
        });
        const key = options.key;

        // Delete every release whose rkey is `<key>:<version>`, paging until exhausted.
        let cursor: string | undefined;
        let deletedReleases = 0;
        do {
          const releases = yield* listRecords(session, NSID.PackageRelease, { limit: 100, cursor });
          cursor = releases.cursor;
          for (const record of releases.records) {
            const rkey = rkeyOf(record.uri);
            if (rkey.startsWith(`${key}:`)) {
              yield* deleteRecord(session, NSID.PackageRelease, rkey);
              yield* Console.log(`Deleted release ${rkey}`);
              deletedReleases += 1;
            }
          }
        } while (cursor !== undefined);

        // Delete the profile (rkey = key).
        yield* deleteRecord(session, NSID.PackageProfile, key);
        yield* Console.log(`Deleted profile ${key} (${deletedReleases} release(s) removed)`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription("Remove a package (profile + releases) from the authenticated user's PDS."));
