//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { createMachine, InterpreterFrom, StateFrom } from 'xstate';

import { log } from '@dxos/log';
import { Identity } from '@dxos/react-client/halo';

type IdentityMachineContext = {
  identity: Identity | null;
};

type IdentityChooseActionEvent = {
  type: 'chooseDevices' | /* 'chooseProfile' | 'chooseSignOut' | */ 'unchooseAction';
};

type IdentityEvent = IdentityChooseActionEvent;

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
      managingDevices: {},
      // managingProfile: {},
      // signingOut: {},
    },
    on: {
      unchooseAction: { target: '.choosingAction', actions: 'log' },
      chooseDevices: { target: '.managingDevices', actions: 'log' },
      // chooseProfile: { target: '.managingProfile', actions: 'log' },
      // chooseSignOut: { target: '.signingOut', actions: 'log' },
    },
  },
  {
    actions: {
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

const useIdentityMachine = (identity: Identity, options?: Parameters<typeof useMachine<IdentityMachine>>[1]) => {
  return useMachine(identityMachine, { ...options, context: { ...options?.context, identity } });
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
