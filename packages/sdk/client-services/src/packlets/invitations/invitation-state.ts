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
import { trace } from '@dxos/tracing';

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
  const mutex = new Mutex();
  let lastActiveLockHolder: FlowLockHolder | null = null;
  let currentInvitation = { ...invitation };
  const isStateChangeAllowed = (lockHolder: FlowLockHolder | null) => {
    if (ctx.disposed || (lockHolder !== null && mutex.isLocked() && !lockHolder.hasFlowLock())) {
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
      emitTransitionSpan(ctx, currentInvitation, newState.state ?? currentInvitation.state);
      currentInvitation = { ...currentInvitation, ...newState };
      stream.next(currentInvitation);
      return ctx.dispose();
    },
    set: (lockHolder: FlowLockHolder | null, newState: Invitation.State): boolean => {
      if (isStateChangeAllowed(lockHolder)) {
        logStateUpdate(currentInvitation, lockHolder, newState);
        emitTransitionSpan(ctx, currentInvitation, newState, lockHolder);
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
        emitTransitionSpan(ctx, currentInvitation, Invitation.State.ERROR, lockHolder, error);
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

/** Naming carrier: `trace.spanStart` derives span names from the instance's class name. */
class InvitationFlow {}
const SPAN_INSTANCE = new InvitationFlow();
let transitionCounter = 0;

/**
 * Instant remote span per state transition, parented on the invitation flow span carried by
 * `ctx`. A stalled flow is otherwise invisible in traces — it waits without emitting anything —
 * so the last transition span marks exactly where it stopped (G1 in
 * docs/design/tracing-improvement-spec.md).
 */
const emitTransitionSpan = (
  ctx: Context,
  invitation: Invitation,
  newState: Invitation.State,
  actor?: any,
  error?: Error,
) => {
  const id = `invitation-state-${invitation.invitationId}-${transitionCounter++}`;
  void trace.spanStart({
    id,
    instance: SPAN_INSTANCE,
    methodName: `state.${stateToString(newState)}`,
    parentCtx: ctx,
    op: 'invitation.state',
    attributes: {
      invitationId: invitation.invitationId,
      oldState: stateToString(invitation.state),
      newState: stateToString(newState),
      actor: actor?.constructor?.name,
      ...(error ? { error: error.message } : {}),
    },
  });
  trace.spanEnd(id);
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
  log.verbose('dxos.sdk.invitations-handler.state.update', logContext);
};

const isNonTerminalState = (currentState: Invitation.State): boolean => {
  return ![
    Invitation.State.SUCCESS,
    Invitation.State.ERROR,
    Invitation.State.CANCELLED,
    Invitation.State.TIMEOUT,
    Invitation.State.EXPIRED,
  ].includes(currentState);
};
