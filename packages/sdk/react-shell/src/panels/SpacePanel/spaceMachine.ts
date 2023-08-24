//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { assign, createMachine, InterpreterFrom, StateFrom, Subscribable } from 'xstate';

import { log } from '@dxos/log';
import { Client } from '@dxos/react-client';
import { Space } from '@dxos/react-client/echo';
import { Identity } from '@dxos/react-client/halo';
import { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { IdentityEvent, SetIdentityEvent, StepEvent } from '../../steps';
import { ErsatzSpace } from './SpacePanelProps';

type SpaceMachineContext = {
  identity: Identity | null;
  identitySubscribable: Subscribable<SetIdentityEvent> | null;
  invitation?: CancellableInvitationObservable;
  space: ErsatzSpace | Space | null;
};

type SpaceSelectInvitationEvent = {
  type: 'selectInvitation';
  invitation: CancellableInvitationObservable;
};

type SpaceEvent = IdentityEvent | SpaceSelectInvitationEvent | StepEvent;

const spaceMachine = createMachine<SpaceMachineContext, SpaceEvent>(
  {
    id: 'space',
    predictableActionArguments: true,
    context: {
      identity: null,
      identitySubscribable: null,
      space: null,
    },
    initial: 'unknown',
    invoke: {
      src: (context) => context.identitySubscribable!,
    },
    states: {
      unknown: {
        always: [
          { cond: 'noProfile', target: 'managingProfile', actions: 'log' },
          { target: 'managingSpace', actions: 'log' },
        ],
      },
      managingProfile: {
        initial: 'idle',
        states: {
          idle: {},
          pending: {},
        },
        on: {
          setIdentity: { target: 'unknown', actions: ['setIdentity', 'log'] },
          setDisplayName: { target: '.pending', actions: 'log' },
        },
      },
      managingSpace: {},
      managingSpaceInvitation: {},
    },
    on: {
      deselectInvitation: { target: '.managingSpace', actions: ['unsetInvitation', 'log'] },
      selectInvitation: { target: '.managingSpaceInvitation', actions: ['setInvitation', 'log'] },
    },
  },
  {
    guards: {
      noProfile: ({ identity }, _event) => !identity?.profile,
    },
    actions: {
      setIdentity: assign<SpaceMachineContext, SpaceEvent>({
        identity: (context, event) => (event as SetIdentityEvent)?.identity ?? null,
      }),
      setInvitation: assign<SpaceMachineContext, SpaceEvent>({
        invitation: (context, event) => (event as SpaceSelectInvitationEvent)?.invitation ?? null,
      }),
      unsetInvitation: assign<SpaceMachineContext, SpaceEvent>({
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

type SpaceMachine = typeof spaceMachine;

type SpaceState = StateFrom<SpaceMachine>;
type SpaceSend = InterpreterFrom<SpaceMachine>['send'];

const useSpaceMachine = (client: Client, options?: Parameters<typeof useMachine<SpaceMachine>>[1]) => {
  return useMachine(spaceMachine, {
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

export type { SpaceMachine, SpaceEvent, SpaceMachineContext, SpaceState, SpaceSend };
export { spaceMachine, useSpaceMachine };
