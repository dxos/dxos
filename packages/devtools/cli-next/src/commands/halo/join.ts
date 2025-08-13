//
// Copyright 2025 DXOS.org
//

import { Args, Command, Prompt } from '@effect/cli';
import { Console, Effect, Match } from 'effect';

import { type AuthenticatingInvitationObservable, Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../services';

const invitationCode = Args.text({ name: 'invitationCode' }).pipe(Args.withDescription('The invitation code'));

export const join = Command.make('join', { invitationCode }, ({ invitationCode: encoded }) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user?
    invariant(!client.halo.identity.get(), 'Identity already exists');

    if (encoded.startsWith('http') || encoded.startsWith('socket')) {
      const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
      encoded = searchParams.get('deviceInvitationCode') ?? encoded;
    }
    const invitationCode = InvitationEncoder.decode(encoded);
    const invitation = client.halo.join(invitationCode);
    yield* waitForState(invitation, Invitation.State.READY_FOR_AUTHENTICATION);
    const authCode = yield* Prompt.text({ message: 'Enter the authentication code' }).pipe(Prompt.run);
    yield* Effect.tryPromise(() => invitation.authenticate(authCode));
    yield* waitForState(invitation, Invitation.State.SUCCESS);

    const identity = client.halo.identity.get();
    yield* Console.log('Identity key:', identity?.identityKey?.toHex());
    yield* Console.log('Display name:', identity?.profile?.displayName);
  }),
);

const waitForState = (invitation: AuthenticatingInvitationObservable, state: Invitation.State) =>
  Effect.gen(function* () {
    const latch = yield* Effect.makeLatch();
    const subscription = invitation.subscribe((invitation) => {
      Match.value(invitation.state).pipe(Match.when(state, () => Effect.runSync(latch.open)));
    });
    yield* latch.await;
    subscription.unsubscribe();
  });
