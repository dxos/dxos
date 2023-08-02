//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';
import { Event, SingleOrArray } from 'xstate';

type StepDeselectInvitationEvent = { type: 'deselectInvitation' };

export type StepEvent = StepDeselectInvitationEvent;

export type StepProps = {
  active?: boolean;
  send: (event: SingleOrArray<Event<StepEvent>>) => void;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
};
