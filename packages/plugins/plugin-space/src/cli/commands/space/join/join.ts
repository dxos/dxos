//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { print, waitForSync } from '@dxos/cli-util';
import { FormBuilder } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

import { acceptInvitation } from './util';

export const handler = Effect.fn(function* ({
  invitationCode,
  authCode,
}: {
  invitationCode: string;
  authCode: Option.Option<string>;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  let encoded = invitationCode;
  if (encoded.startsWith('http') || encoded.startsWith('socket')) {
    const searchParams = new URL(encoded).searchParams;
    encoded = searchParams.get('spaceInvitationCode') ?? encoded;
  }

  const invitation = yield* acceptInvitation({
    observable: client.spaces.join(encoded),
    callbacks: {
      onReadyForAuth: (invitation) => {
        if (Option.isSome(authCode)) {
          return Effect.succeed(Option.getOrUndefined(authCode) ?? undefined) as Effect.Effect<
            string | void,
            never,
            never
          >;
        }
        return Prompt.text({ message: 'Enter the authentication code' })
          .pipe(Prompt.run)
          .pipe(Effect.mapError(() => undefined as never))
          .pipe(Effect.catchAll(() => Effect.succeed(undefined))) as Effect.Effect<string | void, never, never>;
      },
    },
  });

  // Wait for space to be available with retry logic
  const spaceKey = invitation.spaceKey;
  if (!spaceKey) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'No space key in invitation' }, null, 2));
    } else {
      yield* Console.log('No space key in invitation.');
    }
    return;
  }

  let space = client.spaces.get(spaceKey);
  if (!space) {
    // Retry up to 5 times with increasing delays
    const maxRetries = 5;
    const retryDelays = [0.5, 1, 1.5, 2, 2.5].map((s) => Duration.seconds(s));
    for (let i = 0; i < maxRetries; i++) {
      yield* Effect.sleep(retryDelays[i]);
      space = client.spaces.get(spaceKey);
      if (space) {
        break;
      }
    }
  }

  if (!space) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'Space not found after joining' }, null, 2));
    } else {
      yield* Console.log('Space not found after joining.');
    }
    return;
  }

  // Flush and sync after joining
  yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));
  yield* waitForSync(space);

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          spaceId: space.id,
          state: space.state.get(),
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Joined Space' }).pipe(
      FormBuilder.set('spaceId', space.id),
      FormBuilder.set('key', space.key.truncate()),
      FormBuilder.set('name', space.properties.name ?? '<none>'),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const join = Command.make(
  'join',
  {
    invitationCode: Args.text({ name: 'invitationCode' }).pipe(Args.withDescription('The invitation code.')),
    authCode: Options.text('authCode').pipe(Options.withDescription('The authentication code.'), Options.optional),
  },
  handler,
).pipe(Command.withDescription('Join a space via invitation.'));
