//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Invitation, Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

// #region invite
/**
 * Starts an invitation to the space `spaceId`, and returns the flow and the
 * code to send. The guest also needs an authorization code, which the flow's
 * events carry once the guest connects.
 */
export const invite = (spaceId: SpaceId) =>
  Effect.gen(function* () {
    const flow = yield* Space.share(spaceId, { authMethod: 'shared-secret' });
    const code = yield* Invitation.code(flow);
    return { flow, code };
  });
// #endregion

// #region join
/** Redeems the invitation `code`, and returns the flow. */
export const join = (code: string) => Space.join(code);
// #endregion

// #region events
/** The flow's events, until it succeeds, fails or is cancelled. */
export const progress = (flow: Invitation.Flow) =>
  Invitation.events(flow).pipe(
    Stream.takeUntil(
      (event) =>
        event._tag === 'success' ||
        event._tag === 'error' ||
        event._tag === 'cancelled',
    ),
  );

/** Sends the authorization code the host showed. */
export const authenticate = (flow: Invitation.Flow, authCode: string) =>
  Invitation.authenticate(flow, authCode);
// #endregion
