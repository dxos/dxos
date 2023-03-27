//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { useCallback } from 'react';
import { assign, createMachine, InterpreterFrom, StateFrom } from 'xstate';
import type { StateNodeConfig, Subscribable, Subscription } from 'xstate';

import type { Identity, AuthenticatingInvitationObservable, Client } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client';
import { log } from '@dxos/log';

import { JoinPanelMode } from './JoinPanelProps';

type FailReason = 'error' | 'timeout' | 'cancelled' | 'badVerificationCode';

type InvitationDomainContext = Partial<{
  failReason: FailReason | null;
  unredeemedCode: string;
  invitationObservable: AuthenticatingInvitationObservable;
  invitation: Invitation;
  invitationSubscribable: Subscribable<InvitationEvent>;
}>;

type JoinMachineContext = {
  mode: JoinPanelMode;
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

type SetInvitationEvent = {
  type:
    | 'authenticateHaloInvitation'
    | 'authenticateSpaceInvitation'
    | 'connectHaloInvitation'
    | 'connectSpaceInvitation'
    | 'connectionSuccessHaloInvitation'
    | 'connectionSuccessSpaceInvitation';
  invitation: Invitation;
};

type FailInvitationEvent = {
  type: 'failHaloInvitation' | 'failSpaceInvitation';
  reason: FailReason;
};

type EmptyInvitationEvent = {
  type:
    | 'authenticateHaloVerificationCode'
    | 'authenticateSpaceVerificationCode'
    | 'resetHaloInvitation'
    | 'resetSpaceInvitation'
    | 'succeedHaloInvitation'
    | 'succeedSpaceInvitation';
};

type InvitationEvent = FailInvitationEvent | SetInvitationCodeEvent | SetInvitationEvent | EmptyInvitationEvent;

const getInvitationSubscribable = (
  Domain: 'Space' | 'Halo',
  invitation: AuthenticatingInvitationObservable
): Subscribable<InvitationEvent> => {
  log('[subscribing to invitation]', invitation);
  return {
    subscribe: (
      next: (value: InvitationEvent) => void,
      onError?: (error: any) => void,
      complete?: () => void
    ): Subscription => {
      const unsubscribe = invitation.subscribe({
        onAuthenticating: (invitation: Invitation) => {
          log('[invitation authenticating]', { Domain, invitation });
          return next({ type: `authenticate${Domain}Invitation`, invitation });
        },
        onCancelled: () => {
          log.warn('[invitation cancelled]', { Domain });
          return next({ type: `fail${Domain}Invitation`, reason: 'cancelled' } as FailInvitationEvent);
        },
        onTimeout: () => {
          log.error('[invitation timeout]', { Domain });
          return next({ type: `fail${Domain}Invitation`, reason: 'timeout' } as FailInvitationEvent);
        },
        onConnecting: (invitation: Invitation) => {
          log('[invitation connecting]', { Domain, invitation });
          return next({ type: `connect${Domain}Invitation`, invitation });
        },
        onConnected: (invitation: Invitation) => {
          log('[invitation connected]', { Domain, invitation });
          return next({ type: `connectionSuccess${Domain}Invitation`, invitation });
        },
        onSuccess: () => {
          log('[invitation success]', { Domain });
          next({ type: `succeed${Domain}Invitation` });
          return complete?.();
        },
        onError: (error: any) => {
          log.error('[invitation errored]', { Domain, error });
          next({ type: `fail${Domain}Invitation`, reason: 'error' });
          return onError?.(error);
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
          {
            cond: ({ mode }) => mode === 'halo-only' && Domain === 'Space',
            target: '#join.finishingJoiningHalo'
          },
          {
            // cond: `no${Domain}Invitation`,
            target: `inputting${Domain}InvitationCode`,
            actions: 'log'
          }
          // todo(thure): Restore this transition that redeems the invitation code on init.
          // {
          //   target: `acceptingRedeemed${Domain}Invitation`,
          //   actions: [`redeem${Domain}InvitationCode`, 'log']
          // }
        ]
      },
      [`inputting${Domain}InvitationCode`]: {},
      [`acceptingRedeemed${Domain}Invitation`]: {
        invoke: {
          src: (context) => context[Domain.toLowerCase() as 'space' | 'halo'].invitationSubscribable!
        },
        initial: `unknown${Domain}Invitation`,
        states: {
          [`unknown${Domain}Invitation`]: {
            always: [
              {
                cond: (context) => {
                  const invitation = context[Domain.toLowerCase() as 'space' | 'halo'].invitation;
                  return !invitation || invitation?.state === Invitation.State.CONNECTING;
                },
                target: `connecting${Domain}Invitation`,
                actions: 'log'
              },
              {
                target: `inputting${Domain}VerificationCode`,
                actions: 'log'
              }
            ]
          },
          [`connecting${Domain}Invitation`]: {},
          [`inputting${Domain}VerificationCode`]: {
            on: {
              [`authenticate${Domain}VerificationCode`]: {
                target: `authenticating${Domain}VerificationCode`,
                actions: 'log'
              }
            }
          },
          [`authenticating${Domain}VerificationCode`]: {
            on: {
              [`authenticate${Domain}Invitation`]: {
                target: `authenticationFailing${Domain}VerificationCode`,
                actions: 'log'
              }
            }
          },
          [`authenticationFailing${Domain}VerificationCode`]: {},
          [`failing${Domain}Invitation`]: {},
          [`success${Domain}Invitation`]: {}
        },
        on: {
          [`reset${Domain}Invitation`]: {
            target: `#join${
              Domain === 'Halo' ? '.choosingIdentity' : ''
            }.accepting${Domain}Invitation.unknown${Domain}`,
            actions: ['resetInvitation', 'log']
          },
          [`connect${Domain}Invitation`]: {
            target: `.connecting${Domain}Invitation`,
            actions: ['setInvitation', 'log']
          },
          [`connectionSuccess${Domain}Invitation`]: {
            target: `.inputting${Domain}VerificationCode`,
            actions: ['setInvitation', 'log']
          },
          [`succeed${Domain}Invitation`]: { target: successTarget, actions: 'log' },
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
          `redeem${Domain}InvitationCode`,
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
      mode: 'default',
      identity: null,
      halo: {},
      space: {}
    },
    initial: 'unknown',
    states: {
      unknown: {
        always: [
          { cond: 'noSelectedIdentity', target: 'choosingIdentity', actions: 'log' },
          { target: 'acceptingSpaceInvitation', actions: 'log' }
        ]
      },
      choosingIdentity: {
        initial: 'choosingAuthMethod',
        states: {
          choosingAuthMethod: {},
          recoveringIdentity: {},
          creatingIdentity: {},
          acceptingHaloInvitation: acceptingInvitationTemplate('Halo', '#join.acceptingSpaceInvitation'),
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
      acceptingSpaceInvitation: acceptingInvitationTemplate('Space', '#join.finishingJoiningSpace'),
      finishingJoiningSpace: {
        type: 'final'
      },
      finishingJoiningHalo: {
        type: 'final'
      }
    }
  },
  {
    guards: {
      noSelectedIdentity: ({ identity }, _event) => !identity,
      noHaloInvitation: ({ halo }, _event) => !halo.invitation && !halo.unredeemedCode,
      noSpaceInvitation: ({ space }, _event) => !space.invitation && !space.unredeemedCode
    },
    actions: {
      setIdentity: assign<JoinMachineContext, SelectIdentityEvent>({
        identity: (context, event) => event.identity
      }),
      unsetIdentity: assign<JoinMachineContext>({
        identity: () => null
      }),
      resetInvitation: assign<JoinMachineContext, EmptyInvitationEvent>({
        halo: (context, event) =>
          event.type === 'resetHaloInvitation'
            ? {
                ...context.halo,
                invitation: undefined,
                invitationObservable: undefined,
                invitationSubscribable: undefined
              }
            : context.halo,
        space: (context, event) =>
          event.type === 'resetSpaceInvitation'
            ? {
                ...context.space,
                invitation: undefined,
                invitationObservable: undefined,
                invitationSubscribable: undefined
              }
            : context.space
      }),
      setInvitation: assign<JoinMachineContext, SetInvitationEvent>({
        halo: (context, event) =>
          event.type.includes('Halo') ? { ...context.halo, invitation: event.invitation } : context.halo,
        space: (context, event) =>
          event.type.includes('Space') ? { ...context.space, invitation: event.invitation } : context.space
      }),
      log: (context, event) => {
        log('[transition]', {
          event,
          haloInvitation: context.halo.invitation,
          spaceInvitation: context.space.invitation
        });
      }
    }
  }
);

type JoinMachine = typeof joinMachine;

type JoinState = StateFrom<JoinMachine>;
type JoinSend = InterpreterFrom<JoinMachine>['send'];

const useJoinMachine = (client: Client, options?: Parameters<typeof useMachine<JoinMachine>>[1]) => {
  const redeemHaloInvitationCode = useCallback(
    ({ halo }: JoinMachineContext) => {
      if (halo.unredeemedCode) {
        const invitationObservable = client.halo.acceptInvitation(InvitationEncoder.decode(halo.unredeemedCode));
        return {
          ...halo,
          invitationObservable,
          invitationSubscribable: getInvitationSubscribable('Halo', invitationObservable)
        };
      } else {
        return halo;
      }
    },
    [client]
  );
  const redeemSpaceInvitationCode = useCallback(
    ({ space }: JoinMachineContext) => {
      if (space.unredeemedCode) {
        const invitationObservable = client.acceptInvitation(InvitationEncoder.decode(space.unredeemedCode));
        return {
          ...space,
          invitationObservable,
          invitationSubscribable: getInvitationSubscribable('Space', invitationObservable)
        };
      } else {
        return space;
      }
    },
    [client]
  );
  return useMachine(joinMachine, {
    ...options,
    actions: {
      ...options?.actions,
      redeemHaloInvitationCode: assign<JoinMachineContext>({ halo: redeemHaloInvitationCode }),
      redeemSpaceInvitationCode: assign<JoinMachineContext>({ space: redeemSpaceInvitationCode })
    }
  });
};

export type { JoinMachine, JoinState, JoinSend, JoinEvent, JoinMachineContext };
export { joinMachine, useJoinMachine };
