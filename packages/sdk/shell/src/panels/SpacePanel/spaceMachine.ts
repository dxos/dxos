//
// Copyright 2023 DXOS.org
//

import { useMachine } from '@xstate/react';
import { type InterpreterFrom, type StateFrom, assign, createMachine } from 'xstate';

import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { type StepEvent } from '../../steps';

import { type ErsatzSpace } from './SpacePanelProps';

type SpaceMachineContext = {
  invitation?: CancellableInvitationObservable;
  space: ErsatzSpace | Space | null;
};

type SpaceSelectInvitationEvent = {
  type: 'selectInvitation';
  invitation: CancellableInvitationObservable;
};

type SpaceEvent = SpaceSelectInvitationEvent | StepEvent;

const spaceMachine = createMachine<SpaceMachineContext, SpaceEvent>(
  {
    id: 'space',
    predictableActionArguments: true,
    context: {
      space: null,
    },
    initial: 'managingSpace',
    states: {
      managingSpace: {},
      managingSpaceInvitation: {},
    },
    on: {
      deselectInvitation: { target: '.managingSpace', actions: ['unsetInvitation', 'log'] },
      selectInvitation: { target: '.managingSpaceInvitation', actions: ['setInvitation', 'log'] },
    },
  },
  {
    actions: {
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

const useSpaceMachine = (options?: Parameters<typeof useMachine<SpaceMachine>>[1]) =>
  useMachine(spaceMachine, { ...options, context: { ...options?.context } });

export type { SpaceMachine, SpaceEvent, SpaceMachineContext, SpaceState, SpaceSend };
export { spaceMachine, useSpaceMachine };
