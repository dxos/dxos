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
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { stateToString } from './utils';

export interface FlowLockHolder {
  hasFlowLock(): boolean;
}

export interface GuardedInvitationState {
  mutex: Mutex;
  current: Invitation;

  complete(newState: Partial<Invitation>): void;
  set(lockHolder: FlowLockHolder | null, newState: Invitation.State): boolean;
  error(lockHolder: FlowLockHolder | null, error: any): boolean;
}

export const createGuardedInvitationState = (
  ctx: Context,
  invitation: Invitation,
  stream: PushStream<Invitation>,
): GuardedInvitationState => {
  // the mutex guards invitation flow on host and guest side, making sure only one flow is currently active
  // deadlocks seem very unlikely because hosts don't initiate multiple connections
  // even if this somehow happens that there are 2 guests (A, B) and 2 hosts (1, 2) and:
  //  A has lock for flow with 1, B has lock for flow with 2
  //  1 has lock for flow with B, 2 has lock for flow with A
  // there'll be a 10-second introduction timeout after which connection will be closed and deadlock broken
  const mutex = new Mutex();
  let lastActiveLockHolder: FlowLockHolder | null = null;
  let currentInvitation = { ...invitation };
  const isStateChangeAllowed = (lockHolder: FlowLockHolder | null) => {
    if (ctx.disposed || (lockHolder !== null && mutex.isLocked() && !lockHolder.hasFlowLock())) {
      return false;
    }
    // don't allow transitions from a terminal state unless a new extension acquired mutex
    // handles a case when error occurs (e.g. connection is closed) after we completed the flow
    // successfully or already reported another error
    return lockHolder == null || lastActiveLockHolder !== lockHolder || isNonTerminalState(currentInvitation.state);
  };
  return {
    mutex,
    get current() {
      return currentInvitation;
    },
    // disposing context prevents any further state updates
    complete: (newState: Partial<Invitation>) => {
      logStateUpdate(currentInvitation, undefined, invitation.state);
      currentInvitation = { ...currentInvitation, ...newState };
      stream.next(currentInvitation);
      return ctx.dispose();
    },
    set: (lockHolder: FlowLockHolder | null, newState: Invitation.State): boolean => {
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
        logStateUpdate(currentInvitation, lockHolder, Invitation.State.ERROR, error);
        currentInvitation = { ...currentInvitation, state: Invitation.State.ERROR };
        stream.next(currentInvitation);
        stream.error(error);
        lastActiveLockHolder = lockHolder;
        return true;
      }
      return false;
    },
  };
};

const logStateUpdate = (invitation: Invitation, actor: any, newState: Invitation.State, error?: Error) => {
  const logContext = {
    invitationId: invitation.invitationId,
    actor: actor?.constructor.name,
    newState: stateToString(newState),
    oldState: stateToString(invitation.state),
    error: error?.message,
    errorStack: error?.stack,
  };
  if (isNonTerminalState(newState)) {
    log.verbose('dxos.sdk.invitations-handler.state.update', logContext);
  } else {
    log.info('dxos.sdk.invitations-handler.state.update', logContext);
  }
};

const isNonTerminalState = (currentState: Invitation.State): boolean =>
  ![
    Invitation.State.SUCCESS,
    Invitation.State.ERROR,
    Invitation.State.CANCELLED,
    Invitation.State.TIMEOUT,
    Invitation.State.EXPIRED,
  ].includes(currentState);
