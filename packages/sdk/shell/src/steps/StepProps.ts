//
// Copyright 2023 DXOS.org
//

import { type cloneElement } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

type StepDeselectInvitationEvent = { type: 'deselectInvitation' };
type StepResetIdentityEvent = { type: 'resetIdentity' };

export type StepEvent = StepDeselectInvitationEvent | StepResetIdentityEvent;

export type StepProps = {
  active?: boolean;
  send?: (event: SingleOrArray<Event<StepEvent>>) => void;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
};
