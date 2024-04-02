//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { assign, createMachine, type InterpreterFrom, type StateFrom, type Subscribable } from 'xstate';

import { log } from '@dxos/log';
import { type Client } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { type CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { type StepEvent } from '../../steps';

type IdentityMachineContext = {
  invitation?: CancellableInvitationObservable;
  identity: Identity | null;
  identitySubscribable: Subscribable<SetIdentityEvent> | null;
};

type IdentityChooseActionEvent = {
  type:
    | 'chooseDevices'
    | 'chooseAgent'
    | 'chooseProfile'
    | 'chooseResetStorage'
    | 'chooseJoinNewIdentity'
    | 'unchooseAction';
};

type IdentitySelectDeviceInvitationEvent = {
  type: 'selectInvitation';
  invitation: CancellableInvitationObservable;
};

export type SetIdentityEvent = {
  type: 'setIdentity';
  identity: Identity | null;
};

export type UpdateProfileEvent = {
  type: 'updateProfile';
};

type IdentityEvent =
  | SetIdentityEvent
  | UpdateProfileEvent
  | IdentitySelectDeviceInvitationEvent
  | IdentityChooseActionEvent
  | StepEvent;

const identityMachine = createMachine<IdentityMachineContext, IdentityEvent>(
  {
    id: 'identity',
    predictableActionArguments: true,
    context: {
      identity: null,
      identitySubscribable: null,
    },
    initial: 'choosingAction',
    invoke: {
      src: (context) => context.identitySubscribable!,
    },
    states: {
      choosingAction: {},
      managingDeviceInvitation: {},
      managingAgent: {
        initial: 'idle',
        states: {
          idle: {},
          pending: {},
        },
      },
      managingDevices: {},
      managingProfile: {
        initial: 'idle',
        states: {
          idle: {},
          pending: {},
        },
        on: {
          setIdentity: { target: 'choosingAction', actions: ['setIdentity', 'log'] },
          updateProfile: { target: '.pending', actions: 'log' },
        },
      },
      confirmingResetStorage: {},
      confirmingJoinNewIdentity: {},
    },
    on: {
      unchooseAction: { target: '.choosingAction', actions: ['unsetInvitation', 'log'] },
      deselectInvitation: { target: '.choosingAction', actions: ['unsetInvitation', 'log'] },
      selectInvitation: { target: '.managingDeviceInvitation', actions: ['setInvitation', 'log'] },
      chooseDevices: { target: '.managingDevices', actions: 'log' },
      chooseProfile: { target: '.managingProfile', actions: 'log' },
      chooseJoinNewIdentity: { target: '.confirmingJoinNewIdentity', actions: 'log' },
      chooseResetStorage: { target: '.confirmingResetStorage', actions: 'log' },
      chooseAgent: { target: '.managingAgent', actions: 'log' },
    },
  },
  {
    actions: {
      setIdentity: assign<IdentityMachineContext, IdentityEvent>({
        identity: (context, event) => (event as SetIdentityEvent)?.identity ?? null,
      }),
      setInvitation: assign<IdentityMachineContext, IdentityEvent>({
        invitation: (context, event) => (event as IdentitySelectDeviceInvitationEvent)?.invitation ?? null,
      }),
      unsetInvitation: assign<IdentityMachineContext, IdentityEvent>({
        invitation: () => undefined,
      }),
      log: (context, event) => {
        log('[transition]', {
          event,
          context,
        });
      },
    },
  },
);

type IdentityMachine = typeof identityMachine;

type IdentityState = StateFrom<IdentityMachine>;
type IdentitySend = InterpreterFrom<IdentityMachine>['send'];

const useIdentityMachine = (client: Client, options?: Parameters<typeof useMachine<IdentityMachine>>[1]) => {
  return useMachine(identityMachine, {
    ...options,
    context: {
      ...options?.context,
      identity: client.halo.identity.get(),
      identitySubscribable: client.halo.identity.map((identity) => ({
        type: 'setIdentity',
        identity,
      })) satisfies Subscribable<SetIdentityEvent>,
    },
  });
};

export type {
  IdentityMachine,
  IdentityEvent,
  IdentityMachineContext,
  IdentityChooseActionEvent,
  IdentityState,
  IdentitySend,
};
export { identityMachine, useIdentityMachine };
