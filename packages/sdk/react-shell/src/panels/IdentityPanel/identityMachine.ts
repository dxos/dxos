//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { assign, createMachine, InterpreterFrom, StateFrom } from 'xstate';

import { log } from '@dxos/log';
import { Identity } from '@dxos/react-client/halo';
import { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { StepEvent } from '../../steps';

type IdentityMachineContext = {
  invitation?: CancellableInvitationObservable;
  identity: Identity | null;
};

type IdentityChooseActionEvent = {
  type: 'chooseDevices' | /* 'chooseProfile' | 'chooseSignOut' | */ 'unchooseAction';
};

type IdentitySelectDeviceInvitationEvent = {
  type: 'selectInvitation';
  invitation: CancellableInvitationObservable;
};

type IdentityEvent = IdentitySelectDeviceInvitationEvent | IdentityChooseActionEvent | StepEvent;

const identityMachine = createMachine<IdentityMachineContext, IdentityEvent>(
  {
    id: 'identity',
    predictableActionArguments: true,
    context: {
      identity: null,
    },
    initial: 'choosingAction',
    states: {
      choosingAction: {},
      managingDeviceInvitation: {},
      // managingProfile: {},
      // signingOut: {},
    },
    on: {
      unchooseAction: { target: '.choosingAction', actions: ['unsetInvitation', 'log'] },
      chooseDevices: { target: '.managingDeviceInvitation', actions: ['unsetInvitation', 'log'] },
      deselectInvitation: { target: '.choosingAction', actions: ['unsetInvitation', 'log'] },
      selectInvitation: { target: '.managingDeviceInvitation', actions: ['setInvitation', 'log'] },
      // chooseProfile: { target: '.managingProfile', actions: 'log' },
      // chooseSignOut: { target: '.signingOut', actions: 'log' },
    },
  },
  {
    actions: {
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

const useIdentityMachine = (options?: Parameters<typeof useMachine<IdentityMachine>>[1]) => {
  return useMachine(identityMachine, { ...options, context: { ...options?.context } });
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
