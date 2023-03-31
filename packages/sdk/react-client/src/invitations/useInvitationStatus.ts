//
// Copyright 2022 DXOS.org
//

import { useReducer, Reducer, useMemo, useCallback, useEffect } from 'react';

import { TimeoutError } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  CancellableInvitationObservable,
  Invitation,
  InvitationEncoder,
  PublicKey
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
  observable?: CancellableInvitationObservable | AuthenticatingInvitationObservable;
  id?: string;
  invitationCode?: string;
  authCode?: string;
}

export type InvitationAction =
  | {
      status: Invitation.State.INIT | Invitation.State.AUTHENTICATING;
    }
  | {
      status: Invitation.State.CONNECTING;
      observable: CancellableInvitationObservable;
    }
  | {
      status: Invitation.State.CONNECTED;
      id: string;
      invitationCode: string;
      authCode?: string;
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
      error?: Error;
      haltedAt: Invitation.State;
    };

export type InvitationStatus = {
  id?: string;
  invitationCode?: string;
  authCode?: string;
  authMethod?: Invitation['authMethod'];
  status: Invitation.State;
  haltedAt?: Invitation.State;
  result: InvitationResult;
  error?: number;
  cancel(): void;
  connect(observable: CancellableInvitationObservable): void;
  authenticate(authCode: string): Promise<void>;
};

export const useInvitationStatus = (initialObservable?: CancellableInvitationObservable): InvitationStatus => {
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
        authCode: action.status === Invitation.State.CONNECTED ? action.authCode : prev.authCode,
        // `error` gets set each time we enter the error state
        ...(action.status === Invitation.State.ERROR && { error: action.error }),
        // `haltedAt` gets set on only the first error/cancelled/timeout action and reset on any others.
        ...((action.status === Invitation.State.ERROR ||
          action.status === Invitation.State.CANCELLED ||
          action.status === Invitation.State.TIMEOUT) && {
          haltedAt: typeof prev.haltedAt === 'undefined' ? action.haltedAt : prev.haltedAt
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

  // Handle unmount

  useEffect(() => {
    const subscription = state.observable?.subscribe(
      (invitation: Invitation) => {
        switch (invitation.state) {
          case Invitation.State.CONNECTED: {
            dispatch({
              status: invitation.state,
              id: invitation.invitationId!,
              invitationCode: InvitationEncoder.encode(invitation),
              authCode: invitation.authCode
            });
            break;
          }

          case Invitation.State.AUTHENTICATING: {
            dispatch({ status: invitation.state });
            break;
          }

          case Invitation.State.SUCCESS: {
            dispatch({
              status: invitation.state,
              result: {
                spaceKey: invitation.spaceKey || null,
                identityKey: invitation.identityKey || null,
                swarmKey: invitation.swarmKey || null
              }
            });
            break;
          }

          case Invitation.State.CANCELLED: {
            dispatch({ status: invitation.state, haltedAt: state.status });
            break;
          }
        }
      },
      (err: Error) => {
        if (err instanceof TimeoutError) {
          dispatch({ status: Invitation.State.TIMEOUT, haltedAt: state.status });
        } else {
          dispatch({ status: Invitation.State.ERROR, error: err, haltedAt: state.status });
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [state.observable, state.status]);

  // Return memoized callbacks & values

  const connect = useCallback((observable: CancellableInvitationObservable) => {
    dispatch({ status: Invitation.State.CONNECTING, observable });
  }, []);

  const authenticate = useCallback(
    (authCode: string) => {
      log('authenticating...', { authCode });
      return (state.observable as AuthenticatingInvitationObservable).authenticate(authCode);
    },
    [state.observable]
  );

  const cancel = useCallback(async () => state.observable?.cancel(), [state.observable]);

  return useMemo(() => {
    const invitation = state.observable?.get();
    const result = {
      status: state.status,
      haltedAt: state.haltedAt,
      result: state.result,
      error: state.error,
      cancel,
      connect,
      authenticate,
      id: invitation?.invitationId,
      invitationCode: invitation ? InvitationEncoder.encode(invitation) : undefined,
      authCode: invitation?.authCode,
      authMethod: invitation?.authMethod
    };

    // TODO(wittjosiah): Remove. Playwright currently only supports reading clipboard in chromium.
    //   https://github.com/microsoft/playwright/issues/13037
    if (result.status === Invitation.State.CONNECTED) {
      log.info(JSON.stringify({ authCode: result.authCode, authMethod: result.authMethod }));
    } else if (result.status === Invitation.State.INIT) {
      log.info(JSON.stringify({ invitationCode: result.invitationCode, authMethod: result.authMethod }));
    }

    return result;
  }, [state, connect, authenticate]);
};
