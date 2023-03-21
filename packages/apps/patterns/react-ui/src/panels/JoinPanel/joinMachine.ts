//
// Copyright 2023 DXOS.org
//

import { useCallback } from 'react';
import { assign, createMachine, EventObject, Observer, StateNodeConfig, Subscribable, Subscription } from 'xstate';

import type { Identity, AuthenticatingInvitationObservable, Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client';

type FailReason = 'error' | 'timeout' | 'cancelled' | 'badVerificationCode';

type InvitationDomainContext = Partial<{
  failReason: FailReason | null;
  unredeemedCode: string;
  invitation: Subscribable<InvitationEvent>;
}>;

export type JoinMachineContext = {
  identity: Identity | null;
  halo: InvitationDomainContext;
  space: InvitationDomainContext;
};

type SelectIdentityEvent = {
  type: 'selectIdentity';
  identity: Identity;
};

type FailInvitationEvent = {
  type: 'failHaloInvitation' | 'failSpaceInvitation';
  reason: FailReason;
};

type InvitationEvent = FailInvitationEvent | EventObject;

const wrapInvitation = (
  Domain: 'Space' | 'Halo',
  invitation: AuthenticatingInvitationObservable
): Subscribable<InvitationEvent> => {
  return {
    subscribe: (observer: Observer<InvitationEvent>): Subscription => {
      const unsubscribe = invitation.subscribe({
        onAuthenticating: () => observer.next({ type: `authenticate${Domain}VerificationCode` }),
        onCancelled: () =>
          observer.next({ type: `fail${Domain}Invitation`, reason: 'cancelled' } as FailInvitationEvent),
        onTimeout: () => observer.next({ type: `fail${Domain}Invitation`, reason: 'timeout' } as FailInvitationEvent),
        onConnecting: () => observer.next({ type: `connect${Domain}Invitation` }),
        onConnected: () => observer.next({ type: `connectionSuccess${Domain}Invitation` }),
        onSuccess: () => observer.complete(),
        onError: (error: any) => observer.error(error)
      });
      return { unsubscribe };
    }
  } as Subscribable<InvitationEvent>;
};

export const useJoinMachineClientActions = (client: Client) => {
  const redeemHaloInvitationCode = useCallback(
    () =>
      assign<JoinMachineContext>({
        halo: ({ halo }, _) => {
          if (halo.unredeemedCode) {
            return {
              ...halo,
              unredeemedCode: undefined,
              invitation: wrapInvitation(
                'Halo',
                client.halo.acceptInvitation(InvitationEncoder.decode(halo.unredeemedCode))
              )
            };
          } else {
            return halo;
          }
        }
      }),
    [client]
  );
  const redeemSpaceInvitationCode = useCallback(
    () =>
      assign<JoinMachineContext>({
        space: ({ space }, _) => {
          if (space.unredeemedCode) {
            return {
              ...space,
              unredeemedCode: undefined,
              invitation: wrapInvitation(
                'Space',
                client.echo.acceptInvitation(InvitationEncoder.decode(space.unredeemedCode))
              )
            };
          } else {
            return space;
          }
        }
      }),
    [client]
  );
  return {
    redeemHaloInvitationCode,
    redeemSpaceInvitationCode
  };
};

const acceptingInvitationTemplate = (Domain: 'Space' | 'Halo', successTarget: string) => {
  const config: StateNodeConfig<JoinMachineContext, any, EventObject> = {
    initial: `connecting${Domain}Invitation`,
    entry: [`redeem${Domain}InvitationCode`], // todo(thure): confirm this evaluates *before* the observable is invoked
    invoke: {
      src: (context) => context[Domain.toLowerCase() as 'space' | 'halo'].invitation!
    },
    states: {
      [`connecting${Domain}Invitation`]: {},
      [`inputting${Domain}VerificationCode`]: {},
      [`authenticating${Domain}VerificationCode`]: {},
      [`failing${Domain}Invitation`]: {}
    },
    on: {
      [`connect${Domain}Invitation`]: `.inputting${Domain}VerificationCode`,
      [`entered${Domain}VerificationCode`]: `.authenticating${Domain}VerificationCode`,
      [`authenticationSuccess${Domain}VerificationCode`]: successTarget
    }
  };
  return config as StateNodeConfig<JoinMachineContext, typeof config, EventObject>;
};

export const joinMachine = createMachine<JoinMachineContext>(
  {
    id: 'join',
    predictableActionArguments: true,
    context: {
      identity: null,
      halo: {},
      space: {}
    },
    initial: 'choosingIdentity',
    states: {
      choosingIdentity: {
        initial: 'unknown',
        states: {
          unknown: {
            always: [
              { target: 'choosingAuthMethod', cond: 'hasSelectedIdentity' },
              { target: 'connectingToSpace', cond: 'noSelectedIdentity' }
            ]
          },
          choosingAuthMethod: {},
          restoringIdentity: {},
          creatingIdentity: {},
          acceptingHaloInvitation: acceptingInvitationTemplate('Halo', 'choosingIdentity.confirmingAddedIdentity'),
          confirmingAddedIdentity: {}
        },
        on: {
          restoreIdentity: '.restoringIdentity',
          createIdentity: '.createIdentity',
          acceptHaloInvitation: '.acceptingHaloInvitation',
          addIdentity: '.confirmingAddedIdentity',
          selectIdentity: {
            target: 'join.acceptingSpaceInvitation',
            actions: 'setIdentity'
          },
          deselectAuthMethod: '.choosingAuthMethod'
        }
      },
      acceptingSpaceInvitation: acceptingInvitationTemplate('Space', 'join.finishingJoining'),
      finishingJoining: {
        type: 'final'
      }
    }
  },
  {
    guards: {
      hasSelectedIdentity: (context, _event) => {
        return !!context.identity;
      },
      noSelectedIdentity: (context, _event) => {
        return !context.identity;
      }
    },
    actions: {
      setIdentity: assign<JoinMachineContext, SelectIdentityEvent>({
        identity: (context, event) => event.identity
      }),
      unsetIdentity: assign<JoinMachineContext>({
        identity: () => null
      })
    }
  }
);
