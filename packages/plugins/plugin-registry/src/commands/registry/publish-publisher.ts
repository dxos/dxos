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

import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveSession } from './util';

/**
 * `dx registry publish-publisher` — publishes the authenticated user's own
 * `org.dxos.experimental.publisher.profile` record (rkey = `self`).
 *
 * This is metadata about the publisher (the human/org), shown alongside their
 * packages once a verifier has attested to their identity.
 */
export const publishPublisher = Command.make(
  'publish-publisher',
  {
    handle: Options.text('handle').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle),
      Options.optional,
    ),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    displayName: Options.text('display-name').pipe(
      Options.withDescription('Publisher display name (the human/org name shown in UIs).'),
    ),
    bio: Options.text('bio').pipe(Options.withDescription('Short bio.'), Options.optional),
    homepageUrl: Options.text('homepage-url').pipe(
      Options.withDescription('Publisher homepage URL.'),
      Options.optional,
    ),
    contact: Options.text('contact').pipe(
      Options.withDescription('Contact (email, handle, etc.).'),
      Options.optional,
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

        const record: Record<string, unknown> = {
          displayName: options.displayName,
        };
        const bio = Option.getOrUndefined(options.bio);
        if (bio !== undefined) {
          record.bio = bio;
        }
        const homepageUrl = Option.getOrUndefined(options.homepageUrl);
        if (homepageUrl !== undefined) {
          record.homepageUrl = homepageUrl;
        }
        const contact = Option.getOrUndefined(options.contact);
        if (contact !== undefined) {
          record.contact = contact;
        }

        const result = yield* putRecord(session, NSID.PublisherProfile, 'self', record);
        yield* Console.log(`Publisher ${result.uri}`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription("Publish the authenticated user's publisher.profile record (rkey = self)."));
