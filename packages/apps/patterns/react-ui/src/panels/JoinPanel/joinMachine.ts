//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { useCallback } from 'react';
import { assign, createMachine, InterpreterFrom, StateFrom } from 'xstate';
import type { Observer, StateNodeConfig, Subscribable, Subscription } from 'xstate';

import type { Identity, AuthenticatingInvitationObservable, Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client';

type FailReason = 'error' | 'timeout' | 'cancelled' | 'badVerificationCode';

type InvitationDomainContext = Partial<{
  failReason: FailReason | null;
  unredeemedCode: string;
  invitation: AuthenticatingInvitationObservable;
  invitationSubscribable: Subscribable<InvitationEvent>;
}>;

type JoinMachineContext = {
  identity: Identity | null;
  halo: InvitationDomainContext;
  space: InvitationDomainContext;
};

type SelectIdentityEvent = {
  type: 'selectIdentity';
  identity: Identity;
};

type SetInvitationCodeEvent = {
  type: 'setHaloInvitationCode' | 'setSpaceInvitationCode';
  code: string;
};

type FailInvitationEvent = {
  type: 'failHaloInvitation' | 'failSpaceInvitation';
  reason: FailReason;
};

type EmptyInvitationEvent = {
  type:
    | 'authenticateHaloVerificationCode'
    | 'authenticateSpaceVerificationCode'
    | 'connectHaloInvitation'
    | 'connectSpaceInvitation'
    | 'connectionSuccessHaloInvitation'
    | 'connectionSuccessSpaceInvitation'
    | 'succeedHaloInvitation'
    | 'succeedSpaceInvitation';
};

type InvitationEvent = FailInvitationEvent | SetInvitationCodeEvent | EmptyInvitationEvent;

const getInvitationSubscribable = (
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
        onSuccess: () => {
          observer.next({ type: `succeed${Domain}Invitation` });
          return observer.complete();
        },
        onError: (error: any) => {
          observer.next({ type: `fail${Domain}Invitation`, reason: 'error' });
          return observer.error(error);
        }
      });
      return { unsubscribe };
    }
  } as Subscribable<InvitationEvent>;
};

const acceptingInvitationTemplate = (Domain: 'Space' | 'Halo', successTarget: string) => {
  const config: StateNodeConfig<JoinMachineContext, any, InvitationEvent> = {
    initial: `unknown${Domain}`,
    states: {
      [`unknown${Domain}`]: {
        always: [
          { target: `..inputting${Domain}InvitationCode`, cond: `noUnredeemed${Domain}InvitationCode`, actions: 'log' },
          {
            target: `..acceptingRedeemed${Domain}Invitation`,
            cond: `hasUnredeemed${Domain}InvitationCode`,
            actions: 'log'
          }
        ]
      },
      [`inputting${Domain}InvitationCode`]: {},
      [`acceptingRedeemed${Domain}Invitation`]: {
        invoke: {
          src: (context) => context[Domain.toLowerCase() as 'space' | 'halo'].invitationSubscribable!
        },
        initial: `connecting${Domain}Invitation`,
        entry: [`redeem${Domain}InvitationCode`], // todo(thure): confirm this evaluates *before* the observable is invoked
        states: {
          [`connecting${Domain}Invitation`]: {},
          [`inputting${Domain}VerificationCode`]: {
            on: {
              [`authenticate${Domain}VerificationCode`]: `..authenticationFailing${Domain}VerificationCode`
            }
          },
          [`authenticationFailing${Domain}VerificationCode`]: {},
          [`failing${Domain}Invitation`]: {},
          [`success${Domain}Invitation`]: {}
        },
        on: {
          [`connect${Domain}Invitation`]: { target: `.connecting${Domain}Invitation`, actions: 'log' },
          [`connectionSuccess${Domain}Invitation`]: { target: `.inputting${Domain}VerificationCode`, actions: 'log' },
          [`authenticate${Domain}VerificationCode`]: { target: `.inputting${Domain}VerificationCode`, actions: 'log' },
          [`succeed${Domain}VerificationCode`]: { target: successTarget, actions: 'log' },
          [`fail${Domain}Invitation`]: {
            target: `.failing${Domain}Invitation`,
            actions: [
              assign({
                [Domain.toLowerCase() as 'space' | 'halo']: (
                  context: JoinMachineContext,
                  event: FailInvitationEvent
                ) => ({
                  ...context[Domain.toLowerCase() as 'space' | 'halo'],
                  failReason: event.reason
                })
              }),
              'log'
            ]
          }
        }
      }
    },
    on: {
      [`set${Domain}InvitationCode`]: {
        target: `.acceptingRedeemed${Domain}Invitation`,
        actions: [
          assign({
            [Domain.toLowerCase() as 'space' | 'halo']: (
              context: JoinMachineContext,
              event: SetInvitationCodeEvent
            ) => ({
              ...context[Domain.toLowerCase() as 'space' | 'halo'],
              unredeemedCode: event.code
            })
          }),
          'log'
        ]
      }
    }
  };
  return config as StateNodeConfig<JoinMachineContext, typeof config, JoinEvent>;
};

type EmptyJoinEvent = {
  type:
    | 'recoverIdentity'
    | 'createIdentity'
    | 'acceptHaloInvitation'
    | 'addIdentity'
    | 'selectIdentity'
    | 'deselectAuthMethod';
};

type JoinEvent = InvitationEvent | SelectIdentityEvent | EmptyJoinEvent;

const joinMachine = createMachine<JoinMachineContext, JoinEvent>(
  {
    id: 'join',
    predictableActionArguments: true,
    context: {
      identity: null,
      halo: {},
      space: {}
    },
    initial: 'unknown',
    states: {
      unknown: {
        always: [
          { target: 'choosingIdentity', cond: ({ identity }) => !identity, actions: 'log' },
          { target: 'acceptingSpaceInvitation', actions: 'log' }
        ]
      },
      choosingIdentity: {
        initial: 'choosingAuthMethod',
        states: {
          choosingAuthMethod: {},
          recoveringIdentity: {},
          creatingIdentity: {},
          // acceptingHaloInvitation: acceptingInvitationTemplate('Halo', '..confirmingAddedIdentity'),
          acceptingHaloInvitation: {},
          confirmingAddedIdentity: {}
        },
        on: {
          recoverIdentity: { target: '.recoveringIdentity', actions: 'log' },
          createIdentity: { target: '.creatingIdentity', actions: 'log' },
          acceptHaloInvitation: { target: '.acceptingHaloInvitation', actions: 'log' },
          addIdentity: { target: '.confirmingAddedIdentity', actions: 'log' },
          selectIdentity: {
            target: 'acceptingSpaceInvitation',
            actions: ['setIdentity', 'log']
          },
          deselectAuthMethod: { target: '.choosingAuthMethod', actions: 'log' }
        }
      },
      // acceptingSpaceInvitation: acceptingInvitationTemplate('Space', '..finishingJoining'),
      acceptingSpaceInvitation: {},
      finishingJoining: {
        type: 'final'
      }
    }
  },
  {
    guards: {
      noSelectedIdentity: ({ identity }, _event) => !identity,
      hasUnredeemedHaloInvitationCode: ({ halo }, _event) => !!halo.unredeemedCode,
      noUnredeemedHaloInvitationCode: ({ halo }, _event) => !halo.unredeemedCode,
      hasUnredeemedSpaceInvitationCode: ({ space }, _event) => !!space.unredeemedCode,
      noUnredeemedSpaceInvitationCode: ({ space }, _event) => !space.unredeemedCode
    },
    actions: {
      setIdentity: assign<JoinMachineContext, SelectIdentityEvent>({
        identity: (context, event) => event.identity
      }),
      unsetIdentity: assign<JoinMachineContext>({
        identity: () => null
      }),
      setInvitationCode: assign<JoinMachineContext, SetInvitationCodeEvent>({
        halo: (context, event) =>
          event.type === 'setHaloInvitationCode'
            ? { ...context.halo, unredeemedCode: event.code, invitation: undefined }
            : context.halo,
        space: (context, event) =>
          event.type === 'setSpaceInvitationCode'
            ? { ...context.space, unredeemedCode: event.code, invitation: undefined }
            : context.space
      }),
      log: (context, event) => {
        console.log('transition', event);
      }
    }
  }
);

type JoinMachine = typeof joinMachine;

type JoinState = StateFrom<JoinMachine>;
type JoinSend = InterpreterFrom<JoinMachine>['send'];

const useJoinMachine = (client: Client, options?: Parameters<typeof useMachine<JoinMachine>>[1]) => {
  const redeemHaloInvitationCode = useCallback(
    () =>
      assign<JoinMachineContext>({
        halo: ({ halo }, _) => {
          if (halo.unredeemedCode) {
            const invitation = client.halo.acceptInvitation(InvitationEncoder.decode(halo.unredeemedCode));
            return {
              ...halo,
              unredeemedCode: undefined,
              invitation,
              invitationSubscribable: getInvitationSubscribable('Halo', invitation)
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
            const invitation = client.echo.acceptInvitation(InvitationEncoder.decode(space.unredeemedCode));
            return {
              ...space,
              unredeemedCode: undefined,
              invitation,
              invitationSubscribable: getInvitationSubscribable('Space', invitation)
            };
          } else {
            return space;
          }
        }
      }),
    [client]
  );
  return useMachine(joinMachine, {
    ...options,
    actions: { ...options?.actions, redeemHaloInvitationCode, redeemSpaceInvitationCode }
  });
};

export type { JoinMachine, JoinState, JoinSend, JoinEvent, JoinMachineContext };
export { joinMachine, useJoinMachine };
