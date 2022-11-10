//
// Copyright 2022 DXOS.org
//

import { useReducer, Reducer, useMemo, useCallback, useEffect } from 'react';

import { TimeoutError } from '@dxos/async';
import { PublicKey, Invitation, InvitationEncoder, InvitationObservable } from '@dxos/client';

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
  error?: number;
  wrapper?: InvitationObservable;
}

export type InvitationAction =
  | {
      status: Invitation.State.INIT | Invitation.State.AUTHENTICATING;
    }
  | {
      status: Invitation.State.CONNECTING;
      wrapper: InvitationObservable;
    }
  | {
      status: Invitation.State.CONNECTED;
      code: string;
      id: string;
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

export const useInvitationStatus = (initialWrapper?: InvitationObservable) => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) =>
      ({
        status: action.status,
        // `invitationObservable`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === Invitation.State.SUCCESS ? action.result : prev.result,
        wrapper: action.status === Invitation.State.CONNECTING ? action.wrapper : prev.wrapper,
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
        wrapper: initialWrapper
      };
    }
  );

  // Observed event callbacks

  const onConnected = useCallback((invitation: Invitation) => {
    dispatch({
      status: Invitation.State.CONNECTED,
      code: InvitationEncoder.encode(invitation),
      id: invitation.invitationId!
    });
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
    return state.wrapper?.subscribe({
      onConnected,
      onSuccess,
      onError,
      onCancelled,
      onTimeout
    });
  }, [state.wrapper, onConnected, onSuccess, onError, onCancelled, onTimeout]);

  // Return memoized callbacks & values

  const connect = useCallback((wrapper: InvitationObservable) => {
    dispatch({ status: Invitation.State.CONNECTING, wrapper });
  }, []);

  const cancel = useCallback(async () => state.wrapper?.cancel(), [state.wrapper]);

  return useMemo(() => {
    return {
      status: state.status,
      haltedAt: state.haltedAt,
      result: state.result,
      error: state.error,
      cancel,
      connect,
      id: state.wrapper?.invitation?.invitationId ?? null,
      code: state.wrapper?.invitation ? InvitationEncoder.encode(state.wrapper.invitation) : null
    };
  }, [state, connect]);
};
