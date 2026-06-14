//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { FormBuilder } from '@dxos/cli-util';
import { type AuthenticatingInvitationObservable, Invitation } from '@dxos/client/invitations';

/**
 * Pretty prints an identity with ANSI colors.
 */
export const printIdentity = (identity: { identityDid: string; profile?: { displayName?: string } }) =>
  FormBuilder.make({ title: 'Identity' }).pipe(
    FormBuilder.set('identityDid', identity.identityDid),
    FormBuilder.set('displayName', identity.profile?.displayName ?? '<none>'),
    FormBuilder.build,
  );

/** Await an authenticating invitation reaching the given state. */
export const waitForState = (invitation: AuthenticatingInvitationObservable, state: Invitation.State) =>
  Effect.gen(function* () {
    const latch = yield* Effect.makeLatch();
    const subscription = invitation.subscribe((invitation) => {
      Match.value(invitation.state).pipe(Match.when(state, () => Effect.runSync(latch.open)));
    });
    yield* latch.await;
    subscription.unsubscribe();
  });
