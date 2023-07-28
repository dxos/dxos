//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';
import { SingleOrArray, Event } from 'xstate';

import { Space } from '@dxos/react-client/echo';

export type SpacePanelImplProps = {
  titleId: string;
  activeView: string;
  send: (event: SingleOrArray<Event<any>>) => void;
  createInvitationUrl: (invitationCode: string) => string;
  space: Pick<Space, 'key'> & Partial<Pick<Space, 'createInvitation'>> & { properties: { name?: string } };
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
};

export type SpacePanelProps = Pick<SpacePanelImplProps, 'space'> &
  Partial<Omit<SpacePanelImplProps, 'send' | 'activeView' | 'space'>>;

export type SpacePanelHeadingProps = Pick<SpacePanelImplProps, 'titleId' | 'space' | 'onDone' | 'doneActionParent'>;

export type SpacePanelStepProps = Pick<
  SpacePanelImplProps,
  'space' | 'createInvitationUrl' | 'send' | 'onDone' | 'doneActionParent'
> & {
  active?: boolean;
};
