//
// Copyright 2022 DXOS.org
//

import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { type PublicKey } from '@dxos/client';
import {
  type AuthenticatingInvitationObservable,
  type CancellableInvitationObservable,
  type Invitation,
  InvitationEncoder,
  Invitation_AuthMethod,
  Invitation_State,
  type Invitation_Type,
} from '@dxos/client/invitations';
import { log } from '@dxos/log';
import { decodePublicKey } from '@dxos/protocols/buf';

export type InvitationResult = {
  spaceKey: PublicKey | null;
  identityKey: PublicKey | null;
  swarmKey: PublicKey | null;
  target: string | null;
};

interface InvitationReducerState {
  status: Invitation_State; // TODO(burdon): Rename state.
  haltedAt?: Invitation_State;
  result: InvitationResult;
  error?: Error;
  id?: string;
  multiUse?: boolean;
  shareable?: boolean;
  invitationCode?: string;
  authCode?: string;
  authMethod?: Invitation_AuthMethod;
  type?: Invitation_Type;
}

type InvitationPayload = { invitation: Invitation };

export type InvitationAction =
  | ({
      status:
        | Invitation_State.INIT
        | Invitation_State.CONNECTED
        | Invitation_State.READY_FOR_AUTHENTICATION
        | Invitation_State.AUTHENTICATING;
    } & InvitationPayload)
  | ({
      status: Invitation_State.CONNECTING;
      observable: CancellableInvitationObservable;
    } & InvitationPayload)
  | ({
      status: Invitation_State.SUCCESS;
      result: InvitationResult;
    } & InvitationPayload)
  | ({
      status: Invitation_State.CANCELLED | Invitation_State.TIMEOUT;
      haltedAt: Invitation_State;
    } & InvitationPayload)
  | {
      status: Invitation_State.ERROR;
      error?: Error;
      haltedAt: Invitation_State;
    };

export type InvitationStatus = {
  id?: string;
  invitationCode?: string;
  authCode?: string;
  authMethod?: Invitation_AuthMethod;
  type?: Invitation_Type;
  status: Invitation_State;
  haltedAt?: Invitation_State;
  multiUse?: boolean;
  shareable?: boolean;
  result: InvitationResult;
  error?: Error;
  cancel(): void;
  // TODO(wittjosiah): Remove?
  connect(observable: CancellableInvitationObservable): void;
  authenticate(authCode: string): Promise<void>;
};

// Without private key, the invitation code cannot be created.
// These invitations are only available to be accepted but not shared.
const isShareableInvitation = (invitation: Invitation) =>
  invitation.authMethod !== Invitation_AuthMethod.KNOWN_PUBLIC_KEY || !!invitation.guestKeypair?.privateKey;

export const useInvitationStatus = (observable?: CancellableInvitationObservable): InvitationStatus => {
  const [state, dispatch] = useReducer(
    (prev: InvitationReducerState, action: InvitationAction): InvitationReducerState => {
      log('useInvitationStatus', { action });
      const invitationProps =
        'invitation' in action
          ? {
              id: action.invitation.invitationId,
              multiUse: action.invitation.multiUse,
              invitationCode: InvitationEncoder.encode(action.invitation),
              authCode: action.invitation.authCode,
              authMethod: action.invitation.authMethod,
              shareable: isShareableInvitation(action.invitation),
              type: action.invitation.type,
            }
          : {};
      return {
        ...prev,
        ...invitationProps,
        // TODO(burdon): State.
        status: action.status,
        // `invitationObservable`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === Invitation_State.SUCCESS ? action.result : prev.result,
        // `error` gets set each time we enter the error state
        ...(action.status === Invitation_State.ERROR && { error: action.error }),
        // `haltedAt` gets set on only the first error/cancelled/timeout action and reset on any others.
        ...((action.status === Invitation_State.ERROR ||
          action.status === Invitation_State.CANCELLED ||
          action.status === Invitation_State.TIMEOUT) && {
          haltedAt: typeof prev.haltedAt === 'undefined' ? action.haltedAt : prev.haltedAt,
        }),
      };
    },
    null,
    (_arg: null): InvitationReducerState => {
      const invitation = observable?.get();
      return {
        status: Invitation_State.INIT,
        result: { spaceKey: null, identityKey: null, swarmKey: null, target: null },
        id: invitation?.invitationId,
        multiUse: invitation?.multiUse,
        invitationCode: invitation ? InvitationEncoder.encode(invitation) : undefined,
        authCode: invitation?.authCode,
        authMethod: invitation?.authMethod,
        shareable: invitation ? isShareableInvitation(invitation) : false,
        type: invitation?.type,
      };
    },
  );

  // Handle unmount.

  useEffect(() => {
    const update = (invitation: Invitation) => {
      switch (invitation.state) {
        case Invitation_State.INIT:
        case Invitation_State.CONNECTED:
        case Invitation_State.READY_FOR_AUTHENTICATION:
        case Invitation_State.AUTHENTICATING: {
          dispatch({
            invitation,
            status: invitation.state,
          });
          break;
        }

        case Invitation_State.SUCCESS: {
          dispatch({
            invitation,
            status: invitation.state,
            result: {
              spaceKey: invitation.spaceKey ? decodePublicKey(invitation.spaceKey) : null,
              identityKey: invitation.identityKey ? decodePublicKey(invitation.identityKey) : null,
              swarmKey: invitation.swarmKey ? decodePublicKey(invitation.swarmKey) : null,
              target: invitation.target || null,
            },
          });
          break;
        }

        case Invitation_State.CANCELLED:
        case Invitation_State.TIMEOUT: {
          dispatch({ invitation, status: invitation.state, haltedAt: state.status });
          break;
        }
      }
    };

    const subscription = observable?.subscribe(update, (err: Error) => {
      dispatch({ status: Invitation_State.ERROR, error: err, haltedAt: state.status });
    });

    const currentState = observable?.get();
    if (currentState) {
      update(currentState);
    }

    return () => subscription?.unsubscribe();
  }, [observable, state.status]);

  // Return memoized callbacks & values.

  const connect = useCallback((observable: CancellableInvitationObservable) => {
    dispatch({ invitation: observable.get(), status: Invitation_State.CONNECTING, observable });
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
