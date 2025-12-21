//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { type Key } from '@dxos/echo';

import { CommandConfig } from '../../../services';
import { copyToClipboard, getSpace, hostInvitation, openBrowser, print, spaceIdWithDefault } from '../../../util';
import { FormBuilder } from '../../../util';
import { Common } from '../../options';

export const handler = Effect.fn(function* ({
  spaceId,
  multiple,
  open,
  host,
}: {
  spaceId: Option.Option<string>;
  multiple: boolean;
  open: boolean;
  host: string;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  // Always use persistent and delegated (auth required) due to P2P limitations
  const observable = space.share({
    authMethod: Invitation.AuthMethod.SHARED_SECRET,
    persistent: true,
    multiUse: multiple,
  });

  const invitation = yield* hostInvitation({
    observable,
    callbacks: {
      onConnecting: (invitation) =>
        Effect.gen(function* () {
          const invitationCode = InvitationEncoder.encode(invitation);
          const authCode = invitation.authCode!;

          // Copy auth code to clipboard
          yield* copyToClipboard(authCode).pipe(Effect.catchAll(() => Effect.void));

          if (!json) {
            yield* Console.log(`\nSecret: ${authCode} (copied to clipboard)\n`);
          }

          if (open) {
            const url = new URL(host);
            url.searchParams.append('spaceInvitationCode', invitationCode);
            yield* openBrowser(url.toString()).pipe(Effect.catchAll(() => Effect.void));
          } else if (!json) {
            yield* Console.log(`\nInvitation: ${invitationCode}\n`);
          }
        }),
    },
    waitForSuccess: true,
  });

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          invitationCode: InvitationEncoder.encode(invitation),
          authCode: invitation.authCode,
          state: Invitation.State[invitation.state],
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Space Invitation' }).pipe(
      FormBuilder.set('invitationCode', InvitationEncoder.encode(invitation)),
      FormBuilder.set('authCode', invitation.authCode ?? '<none>'),
      FormBuilder.set('state', Invitation.State[invitation.state]),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const share = Command.make(
  'share',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    multiple: Options.boolean('multiple', { ifPresent: true }).pipe(
      Options.withDescription('Create a multi-use invitation.'),
    ),
    open: Options.boolean('open', { ifPresent: true }).pipe(Options.withDescription('Open browser with invitation.')),
    host: Options.text('host').pipe(
      Options.withDescription('Application Host URL.'),
      Options.withDefault('https://composer.space'),
    ),
  },
  handler,
).pipe(Command.withDescription('Create space invitation.'));
