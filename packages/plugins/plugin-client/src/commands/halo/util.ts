//
// Copyright 2025 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

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

const TERMINAL_FAILURE_STATES = new Set([
  Invitation.State.CANCELLED,
  Invitation.State.TIMEOUT,
  Invitation.State.ERROR,
  Invitation.State.EXPIRED,
]);

/** Await an authenticating invitation reaching the given state. */
export const waitForState = (invitation: AuthenticatingInvitationObservable, state: Invitation.State) =>
  Effect.async<void, Error>((resume) => {
    const subscription = invitation.subscribe((inv) => {
      if (inv.state === state) {
        resume(Effect.void);
      } else if (TERMINAL_FAILURE_STATES.has(inv.state!)) {
        resume(Effect.fail(new Error(`Invitation failed with state: ${Invitation.State[inv.state!]}`)));
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
  }).pipe(Effect.timeout(Duration.minutes(3)));
