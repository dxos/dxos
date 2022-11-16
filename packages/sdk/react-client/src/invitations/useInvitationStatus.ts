//
// Copyright 2022 DXOS.org
//

import { useReducer, Reducer, useMemo, useCallback, useEffect } from 'react';

import { TimeoutError } from '@dxos/async';
import {
  PublicKey,
  Invitation,
  InvitationEncoder,
  InvitationObservable,
  AuthenticatingInvitationObservable
} from '@dxos/client';
import { log } from '@dxos/log';

export type InvitationResult = {
  spaceKey: PublicKey | null;
  identityKey: PublicKey | null;
  swarmKey: PublicKey | null;
};

interface InvitationReducerState {
  status: Invitation.State;
  haltedAt?: Invitation.State;
  result: InvitationResult;
  error?: number;
  observable?: InvitationObservable | AuthenticatingInvitationObservable;
  id?: string;
  invitationCode?: string;
  authenticationCode?: string;
}

export type InvitationAction =
  | {
      status: Invitation.State.INIT | Invitation.State.AUTHENTICATING;
    }
  | {
      status: Invitation.State.CONNECTING;
      observable: InvitationObservable;
    }
  | {
      status: Invitation.State.CONNECTED;
      id: string;
      invitationCode: string;
      authenticationCode?: string;
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

export const useInvitationStatus = (initialObservable?: InvitationObservable) => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) => {
      log('useInvitationStatus', { action });
      return {
        status: action.status,
        // `invitationObservable`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === Invitation.State.SUCCESS ? action.result : prev.result,
        observable: action.status === Invitation.State.CONNECTING ? action.observable : prev.observable,
        id: action.status === Invitation.State.CONNECTED ? action.id : prev.id,
        invitationCode: action.status === Invitation.State.CONNECTED ? action.invitationCode : prev.invitationCode,
        authenticationCode:
          action.status === Invitation.State.CONNECTED ? action.authenticationCode : prev.authenticationCode,
        // `error` gets reset each time we leave the error state
        ...(action.status === Invitation.State.ERROR && { error: action.error }),
        // `haltedAt` gets reset each time we leave the error or cancelled state
        ...((action.status === Invitation.State.ERROR ||
          action.status === Invitation.State.CANCELLED ||
          action.status === Invitation.State.TIMEOUT) && {
          haltedAt: action.haltedAt
        })
      } as InvitationReducerState;
    },
    null,
    (_arg: null) => {
      return {
        status: Invitation.State.INIT,
        result: { spaceKey: null, identityKey: null, swarmKey: null },
        observable: initialObservable
      };
    }
  );

  // Observed event callbacks

  const onConnected = useCallback((invitation: Invitation) => {
    dispatch({
      status: Invitation.State.CONNECTED,
      id: invitation.invitationId!,
      invitationCode: InvitationEncoder.encode(invitation),
      authenticationCode: invitation.authenticationCode
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

  const onAuthenticating = useCallback(() => {
    dispatch({ status: Invitation.State.AUTHENTICATING });
  }, [state.status]);

  const onTimeout = useCallback(
    (_err: TimeoutError) => {
      dispatch({ status: Invitation.State.TIMEOUT, haltedAt: state.status });
    },
    [state.status]
  );

  // Handle unmount

  useEffect(() => {
    return state.observable?.subscribe({
      onConnected,
      onSuccess,
      onError,
      onCancelled,
      onAuthenticating,
      onTimeout
    });
  }, [state.observable, onConnected, onSuccess, onError, onCancelled, onAuthenticating, onTimeout]);

  // Return memoized callbacks & values

  const connect = useCallback((observable: InvitationObservable) => {
    dispatch({ status: Invitation.State.CONNECTING, observable });
  }, []);

  const authenticate = useCallback(
    (authenticationCode: string) => {
      log('authenticating...', { authenticationCode });
      return (state.observable as AuthenticatingInvitationObservable).authenticate(authenticationCode);
    },
    [state.observable]
  );

  const cancel = useCallback(async () => state.observable?.cancel(), [state.observable]);

  return useMemo(() => {
    return {
      status: state.status,
      haltedAt: state.haltedAt,
      result: state.result,
      error: state.error,
      cancel,
      connect,
      authenticate,
      id: state.observable?.invitation?.invitationId ?? null,
      invitationCode: state.observable?.invitation ? InvitationEncoder.encode(state.observable?.invitation) : null,
      authenticationCode: state.observable?.invitation?.authenticationCode ?? null
    };
  }, [state, connect, authenticate]);
};
