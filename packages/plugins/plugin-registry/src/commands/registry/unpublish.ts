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

import { AUTH_OPTION_DESCRIPTIONS, NSID, createSession, deleteRecord, listRecords, resolveCredentials } from './util';

const rkeyOf = (uri: string): string => uri.split('/').pop() ?? '';

/**
 * `dx registry unpublish` — removes a package from the authenticated user's PDS:
 * deletes the `package.profile` (rkey = slug) and every `package.release`
 * (rkey = `<slug>_<version>`). The registry indexer unindexes on its next sweep.
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
    slug: Options.text('slug').pipe(
      Options.withDescription('Package slug (the profile rkey). Removes its profile and all releases.'),
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const { handle, appPassword } = yield* resolveCredentials({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
        });
        const session = yield* createSession(handle, appPassword);
        const slug = options.slug;

        // Delete every release whose rkey is `<slug>_<version>`.
        const releases = yield* listRecords(session, NSID.PackageRelease, { limit: 100 });
        let deletedReleases = 0;
        for (const record of releases.records) {
          const rkey = rkeyOf(record.uri);
          if (rkey.startsWith(`${slug}_`)) {
            yield* deleteRecord(session, NSID.PackageRelease, rkey);
            yield* Console.log(`Deleted release ${rkey}`);
            deletedReleases += 1;
          }
        }

        // Delete the profile (rkey = slug).
        yield* deleteRecord(session, NSID.PackageProfile, slug);
        yield* Console.log(`Deleted profile ${slug} (${deletedReleases} release(s) removed)`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription("Remove a package (profile + releases) from the authenticated user's PDS."));
