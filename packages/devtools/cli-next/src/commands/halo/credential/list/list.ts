//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import type { Credential } from '@dxos/client/halo';
import { type Key } from '@dxos/echo';

import { CommandConfig } from '../../../../services';
import { getSpace, printList, spaceIdWithDefault } from '../../../../util';
import { FormBuilder } from '../../../../util';
import { Common } from '../../../options';

const mapCredentials = (credentials: Credential[]) => {
  return credentials.map((credential) => ({
    id: credential.id?.toHex() ?? '<unknown>',
    issuer: credential.issuer?.toHex() ?? '<unknown>',
    subject: credential.subject?.id?.toHex() ?? '<unknown>',
    type: credential.subject.assertion['@type'],
    assertion: credential.subject.assertion,
  }));
};

const printCredential = (credential: Credential) => {
  const type = credential.subject.assertion['@type'] ?? '<unknown>';
  const builder = FormBuilder.of({ title: type });

  if (credential.id) {
    builder.set({ key: 'id', value: credential.id.truncate() });
  }
  if (credential.issuer) {
    builder.set({ key: 'issuer', value: credential.issuer.truncate() });
  }
  if (credential.subject?.id) {
    builder.set({ key: 'subject', value: credential.subject.id.truncate() });
  }

  return builder.build();
};

export const handler = Effect.fn(function* ({
  type,
  spaceId,
  timeout,
  delay,
}: {
  type: Option.Option<string>;
  spaceId: Option.Option<string>;
  timeout: number;
  delay: number;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  let credentials: Credential[];

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  if (Option.isSome(spaceId)) {
    // If space ID was provided, get credentials from that space
    const space = yield* getSpace(resolvedSpaceId);
    credentials = yield* Effect.tryPromise(() => space.internal.getCredentials());
  } else {
    // Get credentials from HALO
    const identity = client.halo.identity;
    if (!identity) {
      if (json) {
        yield* Console.log(JSON.stringify({ error: 'Profile not initialized' }, null, 2));
      } else {
        yield* Console.log('Profile not initialized.');
      }
      return;
    }

    // Wait for at least one credential
    const latch = yield* Effect.makeLatch();
    const subscription = client.halo.credentials.subscribe((creds) => {
      if (creds.length > 0) {
        Effect.runSync(latch.open);
      }
    });

    yield* latch.await.pipe(
      Effect.timeout(Duration.millis(timeout)),
      Effect.catchAll(() => Effect.void),
      Effect.ensuring(
        Effect.sync(() => {
          subscription.unsubscribe();
        }),
      ),
    );

    // Wait a bit more to ensure all credentials are loaded
    yield* Effect.sleep(Duration.millis(delay));

    credentials = client.halo.queryCredentials({ type: Option.getOrUndefined(type) });
  }

  if (json) {
    yield* Console.log(JSON.stringify(mapCredentials(credentials), null, 2));
  } else {
    const formatted = credentials.map(printCredential);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make(
  'list',
  {
    type: Options.text('type').pipe(Options.withDescription('Filter by credential type.'), Options.optional),
    spaceId: Common.spaceId.pipe(Options.withDescription('Space ID to show credentials from.'), Options.optional),
    timeout: Options.integer('timeout').pipe(
      Options.withDescription('Time in milliseconds to wait for at least one credential before listing.'),
      Options.withDefault(500),
    ),
    delay: Options.integer('delay').pipe(
      Options.withDescription('Delay in milliseconds before listing.'),
      Options.withDefault(250),
    ),
  },
  handler,
).pipe(Command.withDescription('List HALO credentials.'));
