//
// Copyright 2022 DXOS.org
//

import { useReducer, Reducer, useMemo, useCallback, useEffect } from 'react';

import { CancellableObservable, TimeoutError } from '@dxos/async';
import { PublicKey, Invitation, InvitationEvents } from '@dxos/client';

type InvitationObservable = CancellableObservable<InvitationEvents>;

export type InvitationResult = {
  spaceKey: PublicKey | null;
  identityKey: PublicKey | null;
  swarmKey: PublicKey | null;
};

export const InvitationState = Invitation.State;
export type InvitationState = Invitation.State;

interface InvitationReducerState {
  status: Invitation.State;
  haltedAt?: Invitation.State;
  result: InvitationResult;
  secret?: string;
  error?: number;
  invitationObservable?: InvitationObservable;
}

export type InvitationAction =
  | {
      status: Invitation.State.INIT | Invitation.State.AUTHENTICATING;
    }
  | {
      status: Invitation.State.CONNECTING;
      invitationObservable: InvitationObservable;
    }
  | {
      status: Invitation.State.CONNECTED;
      secret: string;
    }
  | {
      status: Invitation.State.SUCCESS;
      result: InvitationResult;
    }
  | {
      status: Invitation.State.CANCELLED | Invitation.State.TIMEOUT;
      haltedAt: Invitation.State;
    }
  | {
      status: Invitation.State.ERROR;
      error?: number;
      haltedAt: Invitation.State;
    };

export const useInvitationStatus = () => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) =>
      ({
        status: action.status,
        // `invitationObservable`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === Invitation.State.SUCCESS ? action.result : prev.result,
        secret: action.status === Invitation.State.CONNECTED ? action.secret : prev.secret,
        invitationObservable:
          action.status === Invitation.State.CONNECTING ? action.invitationObservable : prev.invitationObservable,
        // `error` gets reset each time we leave the error state
        ...(action.status === Invitation.State.ERROR && { error: action.error }),
        // `haltedAt` gets reset each time we leave the error or cancelled state
        ...((action.status === Invitation.State.ERROR ||
          action.status === Invitation.State.CANCELLED ||
          action.status === Invitation.State.TIMEOUT) && {
          haltedAt: action.haltedAt
        })
      } as InvitationReducerState),
    null,
    (_arg: null) => {
      return {
        status: Invitation.State.INIT,
        result: { spaceKey: null, identityKey: null, swarmKey: null },
        error: undefined,
        secret: undefined
      };
    }
  );

  // Observed event callbacks

  const onConnected = useCallback((invitation: Invitation) => {
    dispatch({ status: Invitation.State.CONNECTED, secret: invitation.secret!.toString() });
  }, []);

  const onSuccess = useCallback(({ spaceKey, identityKey, swarmKey }: Invitation) => {
    dispatch({
      status: Invitation.State.SUCCESS,
      result: { spaceKey: spaceKey || null, identityKey: identityKey || null, swarmKey: swarmKey || null }
    });
  }, []);

  const onError = useCallback(
    (invitation: Invitation) => {
      dispatch({ status: Invitation.State.ERROR, error: invitation.errorCode, haltedAt: state.status });
    },
    [state.status]
  );

  const onCancelled = useCallback(() => {
    dispatch({ status: Invitation.State.CANCELLED, haltedAt: state.status });
  }, [state.status]);

  const onTimeout = useCallback(
    (_err: TimeoutError) => {
      dispatch({ status: Invitation.State.TIMEOUT, haltedAt: state.status });
    },
    [state.status]
  );

  // Handle unmount

  useEffect(() => {
    return state.invitationObservable?.subscribe({
      onConnected,
      onSuccess,
      onError,
      onCancelled,
      onTimeout
    });
  }, [state.invitationObservable, onConnected, onSuccess, onError, onCancelled, onTimeout]);

  // Return memoized callbacks & values

  const connect = useCallback((invitationObservable: InvitationObservable) => {
    dispatch({ status: Invitation.State.CONNECTING, invitationObservable });
  }, []);

  const cancel = useCallback(async () => state.invitationObservable?.cancel(), [state.invitationObservable]);

  return useMemo(() => {
    return {
      status: state.status,
      haltedAt: state.haltedAt,
      result: state.result,
      secret: state.secret,
      error: state.error,
      cancel,
      connect
    };
  }, [state, connect]);
};
