//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Prompt from '@effect/cli/Prompt';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { type Client } from '@dxos/client';
import { type AuthenticatingInvitationObservable, Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../../services';

export const join = Command.make(
  'join',
  {
    invitationCode: Args.text({ name: 'invitationCode' }).pipe(Args.withDescription('The invitation code.')),
  },
  Effect.fn(function* ({ invitationCode }) {
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Identity already exists');

    const identity = yield* sendInvitation({ client, invitationCode });
    yield* Effect.log('Identity key:', identity?.identityKey?.toHex());
    yield* Effect.log('Display name:', identity?.profile?.displayName);
  }),
).pipe(Command.withDescription('Join an existing identity using an invitation code.'));

const sendInvitation = Effect.fn(function* ({
  client,
  invitationCode: encoded,
}: {
  client: Client;
  invitationCode: string;
}) {
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
  return client.halo.identity.get();
});

const waitForState = (invitation: AuthenticatingInvitationObservable, state: Invitation.State) =>
  Effect.gen(function* () {
    const latch = yield* Effect.makeLatch();
    const subscription = invitation.subscribe((invitation) => {
      Match.value(invitation.state).pipe(Match.when(state, () => Effect.runSync(latch.open)));
    });
    yield* latch.await;
    subscription.unsubscribe();
  });
