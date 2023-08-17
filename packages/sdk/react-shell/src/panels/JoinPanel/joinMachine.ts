//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { useCallback } from 'react';
import { assign, createMachine, InterpreterFrom, StateFrom } from 'xstate';
import type { StateNodeConfig, Subscribable, Subscription } from 'xstate';

import { log } from '@dxos/log';
import type { Client } from '@dxos/react-client';
import { Identity } from '@dxos/react-client/halo';
import { AuthenticatingInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { JoinPanelMode } from './JoinPanelProps';

type FailReason = 'error' | 'timeout' | 'cancelled' | 'badVerificationCode';

type InvitationKindContext = Partial<{
  failReason: FailReason | null;
  unredeemedCode: string;
  invitationObservable: AuthenticatingInvitationObservable;
  invitation: Invitation;
  invitationSubscribable: Subscribable<InvitationEvent>;
}>;

type JoinMachineContext = {
  mode: JoinPanelMode;
  identity: Identity | null;
  halo: InvitationKindContext;
  space: InvitationKindContext;
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
    | 'authenticatingHaloInvitation'
    | 'authenticatingSpaceInvitation'
    | 'readyForAuthenticationHaloInvitation'
    | 'readyForAuthenticationSpaceInvitation'
    | 'connectingHaloInvitation'
    | 'connectingSpaceInvitation'
    | 'connectedHaloInvitation'
    | 'connectedSpaceInvitation'
    | 'successHaloInvitation'
    | 'successSpaceInvitation';
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
    | 'resetSpaceInvitation';
};

type InvitationEvent = FailInvitationEvent | SetInvitationCodeEvent | SetInvitationEvent | EmptyInvitationEvent;

type Kind = 'Space' | 'Halo';

const getInvitationSubscribable = (
  Kind: Kind,
  invitation: AuthenticatingInvitationObservable,
): Subscribable<InvitationEvent> => {
  log('[subscribing to invitation]', invitation);
  return {
    subscribe: (
      next: (value: InvitationEvent) => void,
      onError?: (error: any) => void,
      complete?: () => void,
    ): Subscription =>
      invitation.subscribe(
        (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              log('[invitation connecting]', { Kind, invitation });
              return next({ type: `connecting${Kind}Invitation`, invitation });
            }

            case Invitation.State.CONNECTED: {
              log('[invitation connected]', { Kind, invitation });
              return next({ type: `connected${Kind}Invitation`, invitation });
            }

            case Invitation.State.READY_FOR_AUTHENTICATION: {
              log('[invitation ready for authentication]', { Kind, invitation });
              return next({ type: `readyForAuthentication${Kind}Invitation`, invitation });
            }

            case Invitation.State.AUTHENTICATING: {
              log('[invitation authenticating]', { Kind, invitation });
              return next({ type: `authenticating${Kind}Invitation`, invitation });
            }

            case Invitation.State.SUCCESS: {
              log('[invitation success]', { Kind, invitation });
              next({ type: `success${Kind}Invitation`, invitation });
              return complete?.();
            }

            case Invitation.State.CANCELLED: {
              log.warn('[invitation cancelled]', { Kind });
              return next({ type: `fail${Kind}Invitation`, reason: 'cancelled' } as FailInvitationEvent);
            }

            case Invitation.State.TIMEOUT: {
              log.error('[invitation timeout]', { Kind });
              return next({ type: `fail${Kind}Invitation`, reason: 'timeout' } as FailInvitationEvent);
            }
          }
        },
        (error: any) => {
          log.error('[invitation errored]', { Kind, error });
          next({ type: `fail${Kind}Invitation`, reason: 'error' });
          return onError?.(error);
        },
      ),
  } as Subscribable<InvitationEvent>;
};

const acceptingInvitationTemplate = (Kind: Kind, successTarget: string) => {
  const config: StateNodeConfig<JoinMachineContext, any, InvitationEvent> = {
    initial: `unknown${Kind}`,
    states: {
      [`unknown${Kind}`]: {
        always: [
          {
            cond: ({ mode }) => mode === 'halo-only' && Kind === 'Space',
            target: '#join.finishingJoiningHalo',
          },
          {
            cond: (context) => !!context[Kind.toLowerCase() as Lowercase<typeof Kind>].unredeemedCode,
            target: `acceptingRedeemed${Kind}Invitation`,
            actions: [`redeem${Kind}InvitationCode`, `invalidate${Kind}InvitationCode`, 'log'],
          },
          {
            target: `inputting${Kind}InvitationCode`,
            actions: 'log',
          },
        ],
      },
      [`inputting${Kind}InvitationCode`]: {},
      [`acceptingRedeemed${Kind}Invitation`]: {
        invoke: {
          src: (context) => context[Kind.toLowerCase() as Lowercase<Kind>].invitationSubscribable!,
        },
        initial: `unknown${Kind}Invitation`,
        states: {
          [`unknown${Kind}Invitation`]: {
            always: [
              {
                cond: (context) => {
                  const invitation = context[Kind.toLowerCase() as Lowercase<Kind>].invitation;
                  return !invitation || invitation?.state === Invitation.State.CONNECTING;
                },
                target: `connecting${Kind}Invitation`,
                actions: 'log',
              },
              {
                target: `inputting${Kind}VerificationCode`,
                actions: 'log',
              },
            ],
          },
          [`connecting${Kind}Invitation`]: {},
          [`inputting${Kind}VerificationCode`]: {},
          [`authenticating${Kind}VerificationCode`]: {
            on: {
              [`readyForAuthentication${Kind}Invitation`]: {
                target: `authenticationFailing${Kind}VerificationCode`,
                actions: ['setInvitation', 'log'],
              },
            },
          },
          [`authenticationFailing${Kind}VerificationCode`]: {},
          [`failing${Kind}Invitation`]: {},
          [`success${Kind}Invitation`]: {},
        },
        on: {
          [`reset${Kind}Invitation`]: {
            target: `#join${Kind === 'Halo' ? '.choosingIdentity' : ''}.accepting${Kind}Invitation.unknown${Kind}`,
            actions: ['resetInvitation', 'log'],
          },
          [`connecting${Kind}Invitation`]: {
            target: `.connecting${Kind}Invitation`,
            actions: ['setInvitation', 'log'],
          },
          [`connected${Kind}Invitation`]: {
            target: `.connecting${Kind}Invitation`,
            actions: ['setInvitation', 'log'],
          },
          [`readyForAuthentication${Kind}Invitation`]: {
            target: `.inputting${Kind}VerificationCode`,
            actions: ['setInvitation', 'log'],
          },
          [`authenticating${Kind}Invitation`]: {
            target: `.authenticating${Kind}VerificationCode`,
            actions: ['setInvitation', 'log'],
          },
          [`success${Kind}Invitation`]: { target: successTarget, actions: ['setInvitation', 'log'] },
          [`fail${Kind}Invitation`]: {
            target: `.failing${Kind}Invitation`,
            actions: [
              assign({
                [Kind.toLowerCase()]: (context: JoinMachineContext, event: FailInvitationEvent) => ({
                  ...context[Kind.toLowerCase() as Lowercase<Kind>],
                  failReason: event.reason,
                }),
              }),
              'log',
            ],
          },
        },
      },
    },
    on: {
      [`set${Kind}InvitationCode`]: {
        target: `.acceptingRedeemed${Kind}Invitation`,
        actions: [
          assign({
            [Kind.toLowerCase()]: (context: JoinMachineContext, event: SetInvitationCodeEvent) => ({
              ...context[Kind.toLowerCase() as Lowercase<Kind>],
              unredeemedCode: event.code,
            }),
          }),
          `redeem${Kind}InvitationCode`,
          `invalidate${Kind}InvitationCode`,
          'log',
        ],
      },
    },
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
      space: {},
    },
    initial: 'unknown',
    states: {
      unknown: {
        always: [
          { cond: 'noSelectedIdentity', target: 'choosingIdentity', actions: 'log' },
          { target: 'acceptingSpaceInvitation', actions: 'log' },
        ],
      },
      choosingIdentity: {
        initial: 'unknownAuthMethod',
        states: {
          unknownAuthMethod: {
            always: [
              { cond: 'hasHaloUnredeemedCode', target: 'acceptingHaloInvitation', actions: 'log' },
              { target: 'choosingAuthMethod', actions: 'log' },
            ],
          },
          choosingAuthMethod: {},
          recoveringIdentity: {},
          creatingIdentity: {},
          acceptingHaloInvitation: acceptingInvitationTemplate('Halo', '#join.acceptingSpaceInvitation'),
          confirmingAddedIdentity: {},
        },
        on: {
          recoverIdentity: { target: '.recoveringIdentity', actions: 'log' },
          createIdentity: { target: '.creatingIdentity', actions: 'log' },
          acceptHaloInvitation: { target: '.acceptingHaloInvitation', actions: 'log' },
          addIdentity: { target: '.confirmingAddedIdentity', actions: 'log' },
          selectIdentity: {
            target: 'acceptingSpaceInvitation',
            actions: ['setIdentity', 'log'],
          },
          deselectAuthMethod: { target: '.choosingAuthMethod', actions: 'log' },
        },
      },
      acceptingSpaceInvitation: acceptingInvitationTemplate('Space', '#join.finishingJoiningSpace'),
      finishingJoiningSpace: {
        type: 'final',
      },
      finishingJoiningHalo: {
        type: 'final',
      },
    },
  },
  {
    guards: {
      noSelectedIdentity: ({ identity }, _event) => !identity,
      hasHaloUnredeemedCode: ({ halo }, _event) => !!halo.unredeemedCode,
      noSpaceInvitation: ({ space }, _event) => !space.invitation && !space.unredeemedCode,
    },
    actions: {
      setIdentity: assign<JoinMachineContext, SelectIdentityEvent>({
        identity: (context, event) => event.identity,
      }),
      unsetIdentity: assign<JoinMachineContext>({
        identity: () => null,
      }),
      resetInvitation: assign<JoinMachineContext, EmptyInvitationEvent>({
        halo: (context, event) => {
          if (event.type !== 'resetHaloInvitation') {
            return context.halo;
          }

          if (context.halo.invitationObservable) {
            void context.halo.invitationObservable.cancel();
          }

          return {
            ...context.halo,
            invitation: undefined,
            invitationObservable: undefined,
            invitationSubscribable: undefined,
          };
        },
        space: (context, event) => {
          if (event.type !== 'resetSpaceInvitation') {
            return context.space;
          }

          if (context.space.invitationObservable) {
            void context.space.invitationObservable.cancel();
          }

          return {
            ...context.space,
            invitation: undefined,
            invitationObservable: undefined,
            invitationSubscribable: undefined,
          };
        },
      }),
      setInvitation: assign<JoinMachineContext, SetInvitationEvent>({
        halo: (context, event) =>
          event.type.includes('Halo') ? { ...context.halo, invitation: event.invitation } : context.halo,
        space: (context, event) =>
          event.type.includes('Space') ? { ...context.space, invitation: event.invitation } : context.space,
      }),
      log: (context, event) => {
        log('[transition]', {
          event,
          haloInvitation: context.halo.invitation,
          spaceInvitation: context.space.invitation,
        });
      },
    },
  },
);

type JoinMachine = typeof joinMachine;

type JoinState = StateFrom<JoinMachine>;
type JoinSendVoid = (...params: Parameters<InterpreterFrom<JoinMachine>['send']>) => void;
type JoinSend = InterpreterFrom<JoinMachine>['send'] | JoinSendVoid;

const defaultCodeFromUrl = (invitationType: 'halo' | 'space', text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    return (
      searchParams.get(`${invitationType}InvitationCode`) ??
      searchParams.get(`${invitationType}Invitation`) ??
      searchParams.get('invitationCode') ??
      searchParams.get('invitation') ??
      text
    );
  } catch (err) {
    log.catch(err);
    return text;
  }
};

const useJoinMachine = (
  client: Client,
  options?: Parameters<typeof useMachine<JoinMachine>>[1] & { onInvalidateInvitationCode?: (code: string) => void },
) => {
  const redeemHaloInvitationCode = useCallback(
    ({ halo }: JoinMachineContext) => {
      if (halo.unredeemedCode) {
        const invitationObservable = client.halo.acceptInvitation(
          InvitationEncoder.decode(defaultCodeFromUrl('halo', halo.unredeemedCode)),
        );
        return {
          ...halo,
          invitationObservable,
          invitationSubscribable: getInvitationSubscribable('Halo', invitationObservable),
        };
      } else {
        return halo;
      }
    },
    [client],
  );

  const redeemSpaceInvitationCode = useCallback(
    ({ space }: JoinMachineContext) => {
      if (space.unredeemedCode) {
        const invitationObservable = client.acceptInvitation(
          InvitationEncoder.decode(defaultCodeFromUrl('space', space.unredeemedCode)),
        );
        return {
          ...space,
          invitationObservable,
          invitationSubscribable: getInvitationSubscribable('Space', invitationObservable),
        };
      } else {
        return space;
      }
    },
    [client],
  );

  const invalidateHaloInvitationCode = useCallback(
    ({ halo }: JoinMachineContext) => {
      if (halo.unredeemedCode) {
        options?.onInvalidateInvitationCode?.(halo.unredeemedCode);
        return {
          ...halo,
          unredeemedCode: undefined,
        };
      } else {
        return halo;
      }
    },
    [options?.onInvalidateInvitationCode],
  );

  const invalidateSpaceInvitationCode = useCallback(
    ({ space }: JoinMachineContext) => {
      if (space.unredeemedCode) {
        options?.onInvalidateInvitationCode?.(space.unredeemedCode);
        return {
          ...space,
          unredeemedCode: undefined,
        };
      } else {
        return space;
      }
    },
    [options?.onInvalidateInvitationCode],
  );

  return useMachine(joinMachine, {
    ...options,
    actions: {
      ...options?.actions,
      redeemHaloInvitationCode: assign<JoinMachineContext>({ halo: redeemHaloInvitationCode }),
      redeemSpaceInvitationCode: assign<JoinMachineContext>({ space: redeemSpaceInvitationCode }),
      invalidateHaloInvitationCode: assign<JoinMachineContext>({
        halo: invalidateHaloInvitationCode,
      }),
      invalidateSpaceInvitationCode: assign<JoinMachineContext>({
        space: invalidateSpaceInvitationCode,
      }),
    },
  });
};

export type { JoinMachine, JoinState, JoinSend, JoinEvent, JoinMachineContext };
export { joinMachine, useJoinMachine };
