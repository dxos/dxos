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

import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveHandle, resolveSession } from './util';

/**
 * `dx registry verify` — publishes a `org.dxos.experimental.publisher.verification`
 * record on the authenticated repo, with rkey = subject DID. Subject is given as a
 * handle or DID; handles are resolved through the public XRPC.
 *
 * Verification records are public and anyone may author them. The registry indexer only
 * honors records authored by the configured verifier (`REGISTRY_CURATOR_DID`), so this
 * command only affects discovery when run with that verifier's credentials.
 */
export const verify = Command.make(
  'verify',
  {
    handle: Options.text('handle').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle),
      Options.optional,
    ),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    subject: Options.text('subject').pipe(
      Options.withDescription('Handle or DID of the publisher being verified.'),
    ),
    subjectHandle: Options.text('subject-handle').pipe(
      Options.withDescription(
        'Optional human-readable handle to record for the verified subject (defaults to --subject if it is a handle).',
      ),
      Options.optional,
    ),
    displayName: Options.text('display-name').pipe(
      Options.withDescription('Display name to record for the verified subject.'),
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

        // Subject may be passed as either a handle or a DID; resolve to a DID so the rkey is stable.
        const subjectDid = options.subject.startsWith('did:')
          ? options.subject
          : yield* resolveHandle(options.subject);
        const subjectHandle =
          Option.getOrUndefined(options.subjectHandle) ?? (options.subject.startsWith('did:') ? '' : options.subject);

        const record = {
          subject: subjectDid,
          ...(subjectHandle ? { handle: subjectHandle } : {}),
          displayName: options.displayName,
          createdAt: new Date().toISOString(),
        };

        const result = yield* putRecord(session, NSID.PublisherVerification, subjectDid, record);
        yield* Console.log(`Verified ${subjectDid} -> ${result.uri}`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(
  Command.withDescription(
    'Write a publisher.verification record (indexed only if authored by the configured verifier, REGISTRY_CURATOR_DID).',
  ),
);
