//
// Copyright 2022 DXOS.org
//

import { useReducer, type Reducer, useMemo, useCallback, useEffect } from 'react';

import { type PublicKey } from '@dxos/client';
import {
  type AuthenticatingInvitationObservable,
  type CancellableInvitationObservable,
  Invitation,
  InvitationEncoder,
} from '@dxos/client/invitations';
import { log } from '@dxos/log';

export type InvitationResult = {
  spaceKey: PublicKey | null;
  identityKey: PublicKey | null;
  swarmKey: PublicKey | null;
  target: string | null;
};

interface InvitationReducerState {
  status: Invitation.State; // TODO(burdon): Rename state.
  haltedAt?: Invitation.State;
  result: InvitationResult;
  error?: number;
  observable?: CancellableInvitationObservable | AuthenticatingInvitationObservable;
  id?: string;
  invitationCode?: string;
  authCode?: string;
  multiUse?: boolean;
}

export type InvitationAction =
  | {
      status:
        | Invitation.State.INIT
        | Invitation.State.CONNECTED
        | Invitation.State.READY_FOR_AUTHENTICATION
        | Invitation.State.AUTHENTICATING;
    }
  | {
      status: Invitation.State.CONNECTING;
      observable: CancellableInvitationObservable;
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
  authMethod?: Invitation.AuthMethod;
  type?: Invitation.Type;
  status: Invitation.State;
  haltedAt?: Invitation.State;
  multiUse?: boolean;
  result: InvitationResult;
  error?: number;
  cancel(): void;
  // TODO(wittjosiah): Remove?
  connect(observable: CancellableInvitationObservable): void;
  authenticate(authCode: string): Promise<void>;
};

export const useInvitationStatus = (initialObservable?: CancellableInvitationObservable): InvitationStatus => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) => {
      log('useInvitationStatus', { action });
      return {
        ...prev,
        // TODO(burdon): State.
        status: action.status,
        // `invitationObservable`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === Invitation.State.SUCCESS ? action.result : prev.result,
        // `error` gets set each time we enter the error state
        ...(action.status === Invitation.State.ERROR && { error: action.error }),
        // `haltedAt` gets set on only the first error/cancelled/timeout action and reset on any others.
        ...((action.status === Invitation.State.ERROR ||
          action.status === Invitation.State.CANCELLED ||
          action.status === Invitation.State.TIMEOUT) && {
          haltedAt: typeof prev.haltedAt === 'undefined' ? action.haltedAt : prev.haltedAt,
        }),
        observable:
          action.status === Invitation.State.CONNECTING ? action.observable ?? prev.observable : prev.observable,
      } as InvitationReducerState;
    },
    null,
    (_arg: null) => {
      return {
        status: Invitation.State.INIT,
        result: { spaceKey: null, identityKey: null, swarmKey: null, target: null },
        observable: initialObservable,
      };
    },
  );

  // Handle unmount.

  useEffect(() => {
    const update = (invitation: Invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTED:
        case Invitation.State.READY_FOR_AUTHENTICATION:
        case Invitation.State.AUTHENTICATING: {
          dispatch({
            status: invitation.state,
          });
          break;
        }

        case Invitation.State.SUCCESS: {
          dispatch({
            status: invitation.state,
            result: {
              spaceKey: invitation.spaceKey || null,
              identityKey: invitation.identityKey || null,
              swarmKey: invitation.swarmKey || null,
              target: invitation.target || null,
            },
          });
          break;
        }

        case Invitation.State.CANCELLED:
        case Invitation.State.TIMEOUT: {
          dispatch({ status: invitation.state, haltedAt: state.status });
          break;
        }
      }
    };

    const subscription = state.observable?.subscribe(update, (err: Error) => {
      dispatch({ status: Invitation.State.ERROR, error: err, haltedAt: state.status });
    });

    const currentState = state.observable?.get();
    if (currentState) {
      update(currentState);
    }

    return () => subscription?.unsubscribe();
  }, [state.observable, state.status]);

  // Return memoized callbacks & values.

  const connect = useCallback((observable: CancellableInvitationObservable) => {
    dispatch({ status: Invitation.State.CONNECTING, observable });
  }, []);

  const authenticate = useCallback(
    (authCode: string) => {
      log('authenticating...', { authCode });
      return (state.observable as AuthenticatingInvitationObservable).authenticate(authCode);
    },
    [state.observable],
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
      multiUse: invitation?.multiUse,
      invitationCode: invitation ? InvitationEncoder.encode(invitation) : undefined,
      authCode: invitation?.authCode,
      authMethod: invitation?.authMethod,
      type: invitation?.type,
    };

    return result;
  }, [state, cancel, connect, authenticate]);
};
