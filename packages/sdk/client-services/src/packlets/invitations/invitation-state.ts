/**
 * A utility object for serializing invitation state changes by multiple concurrent
 * invitation flow connections.
 */
//
// Copyright 2024 DXOS.org
//

import { Mutex, type PushStream } from '@dxos/async';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';
import { Invitation, Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { stateToString } from './utils';

export interface FlowLockHolder {
  hasFlowLock(): boolean;
}

export interface GuardedInvitationState {
  mutex: Mutex;
  current: Invitation;

  complete(newState: Partial<Invitation>): void;
  set(lockHolder: FlowLockHolder | null, newState: Invitation_State): boolean;
  error(lockHolder: FlowLockHolder | null, error: any): boolean;
}

export const createGuardedInvitationState = (
  ctx: Context,
  invitation: Invitation,
  stream: PushStream<Invitation>,
): GuardedInvitationState => {
  const mutex = new Mutex();
  let lastActiveLockHolder: FlowLockHolder | null = null;
  let currentInvitation = { ...invitation };
  const isStateChangeAllowed = (lockHolder: FlowLockHolder | null) => {
    if (ctx.disposed || (lockHolder !== null && mutex.isLocked() && !lockHolder.hasFlowLock())) {
      return false;
    }
    // A connection that no longer drives the flow, and that another connection has since taken over
    // from, is superseded: its teardown must not rewind the state the live connection set. Without
    // this, an edge drop mid-invitation lets the dropped connection write `CONNECTING` behind the
    // live one, and the live guest's `introduce` — which asserts CONNECTED — errors the whole
    // invitation (DX-1264). A genuinely new connection is unaffected: it acquires the flow lock
    // before it writes, so `hasFlowLock()` holds.
    if (
      lockHolder !== null &&
      !lockHolder.hasFlowLock() &&
      lastActiveLockHolder !== null &&
      lastActiveLockHolder !== lockHolder
    ) {
      return false;
    }
    return lockHolder == null || lastActiveLockHolder !== lockHolder || isNonTerminalState(currentInvitation.state);
  };
  return {
    mutex,
    get current() {
      return currentInvitation;
    },
    complete: (newState: Partial<Invitation>) => {
      logStateUpdate(currentInvitation, undefined, invitation.state);
      currentInvitation = { ...currentInvitation, ...newState };
      stream.next(currentInvitation);
      return ctx.dispose();
    },
    set: (lockHolder: FlowLockHolder | null, newState: Invitation_State): boolean => {
      if (isStateChangeAllowed(lockHolder)) {
        logStateUpdate(currentInvitation, lockHolder, newState);
        currentInvitation = { ...currentInvitation, state: newState };
        stream.next(currentInvitation);
        lastActiveLockHolder = lockHolder;
        return true;
      }
      return false;
    },
    error: (lockHolder: FlowLockHolder | null, error: any): boolean => {
      if (isStateChangeAllowed(lockHolder)) {
        logStateUpdate(currentInvitation, lockHolder, Invitation_State.ERROR, error);
        currentInvitation = { ...currentInvitation, state: Invitation_State.ERROR };
        stream.next(currentInvitation);
        stream.error(error);
        lastActiveLockHolder = lockHolder;
        return true;
      }
      return false;
    },
  };
};

const logStateUpdate = (
  invitation: Invitation,
  actor: FlowLockHolder | null | undefined,
  newState: Invitation_State,
  error?: Error,
) => {
  const logContext = {
    invitationId: invitation.invitationId,
    actor: actor?.constructor.name,
    newState: stateToString(newState),
    oldState: stateToString(invitation.state),
    error: error?.message,
    errorStack: error?.stack,
  };
  log.verbose('dxos.sdk.invitations-handler.state.update', logContext);
};

const isNonTerminalState = (currentState: Invitation_State): boolean => {
  return ![
    Invitation_State.SUCCESS,
    Invitation_State.ERROR,
    Invitation_State.CANCELLED,
    Invitation_State.TIMEOUT,
    Invitation_State.EXPIRED,
  ].includes(currentState);
};
