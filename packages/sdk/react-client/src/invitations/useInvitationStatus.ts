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
  id?: string;
  multiUse?: boolean;
  invitationCode?: string;
  authCode?: string;
  authMethod?: Invitation.AuthMethod;
  type?: Invitation.Type;
}

type InvitationPayload = { invitation: Invitation };

export type InvitationAction =
  | ({
      status:
        | Invitation.State.INIT
        | Invitation.State.CONNECTED
        | Invitation.State.READY_FOR_AUTHENTICATION
        | Invitation.State.AUTHENTICATING;
    } & InvitationPayload)
  | ({
      status: Invitation.State.CONNECTING;
      observable: CancellableInvitationObservable;
    } & InvitationPayload)
  | ({
      status: Invitation.State.SUCCESS;
      result: InvitationResult;
    } & InvitationPayload)
  | ({
      status: Invitation.State.CANCELLED | Invitation.State.TIMEOUT;
      haltedAt: Invitation.State;
    } & InvitationPayload)
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

export const useInvitationStatus = (observable?: CancellableInvitationObservable): InvitationStatus => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) => {
      log('useInvitationStatus', { action });
      const invitationProps =
        'invitation' in action
          ? {
              id: action.invitation.invitationId,
              multiUse: action.invitation.multiUse,
              invitationCode: InvitationEncoder.encode(action.invitation),
              authCode: action.invitation.authCode,
              authMethod: action.invitation.authMethod,
              type: action.invitation.type,
            }
          : {};
      return {
        ...prev,
        ...invitationProps,
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
      } as InvitationReducerState;
    },
    null,
    (_arg: null) => {
      const invitation = observable?.get();
      return {
        status: Invitation.State.INIT,
        result: { spaceKey: null, identityKey: null, swarmKey: null, target: null },
        id: invitation?.invitationId,
        multiUse: invitation?.multiUse,
        invitationCode: invitation ? InvitationEncoder.encode(invitation) : undefined,
        authCode: invitation?.authCode,
        authMethod: invitation?.authMethod,
        type: invitation?.type,
      };
    },
  );

  // Handle unmount.

  useEffect(() => {
    const update = (invitation: Invitation) => {
      switch (invitation.state) {
        case Invitation.State.INIT:
        case Invitation.State.CONNECTED:
        case Invitation.State.READY_FOR_AUTHENTICATION:
        case Invitation.State.AUTHENTICATING: {
          dispatch({
            invitation,
            status: invitation.state,
          });
          break;
        }

        case Invitation.State.SUCCESS: {
          dispatch({
            invitation,
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
          dispatch({ invitation, status: invitation.state, haltedAt: state.status });
          break;
        }
      }
    };

    const subscription = observable?.subscribe(update, (err: Error) => {
      dispatch({ status: Invitation.State.ERROR, error: err, haltedAt: state.status });
    });

    const currentState = observable?.get();
    if (currentState) {
      update(currentState);
    }

    return () => subscription?.unsubscribe();
  }, [observable, state.status]);

  // Return memoized callbacks & values.

  const connect = useCallback((observable: CancellableInvitationObservable) => {
    dispatch({ invitation: observable.get(), status: Invitation.State.CONNECTING, observable });
  }, []);

  const authenticate = useCallback(
    (authCode: string) => {
      log('authenticating...', { authCode });
      return (observable as AuthenticatingInvitationObservable).authenticate(authCode);
    },
    [observable],
  );

  const cancel = useCallback(async () => observable?.cancel(), [observable]);

  return useMemo(() => {
    return {
      ...state,
      cancel,
      connect,
      authenticate,
    };
  }, [state, cancel, connect, authenticate]);
};
