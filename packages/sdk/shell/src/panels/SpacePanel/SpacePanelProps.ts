//
// Copyright 2023 DXOS.org
//

import { type FC, type cloneElement } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { type Space } from '@dxos/react-client/echo';

import { type InvitationManagerProps } from '../../steps';

import { type SpaceManagerProps } from './steps';

export type ErsatzSpace = Pick<Space, 'key'> & Partial<Pick<Space, 'share'>> & { properties: { name?: string } };

export type SpacePanelImplProps = {
  titleId: string;
  activeView: string;
  send: (event: SingleOrArray<Event<any>>) => void;
  hideHeading?: boolean;
  target?: string;
  createInvitationUrl: (invitationCode: string) => string;
  space: ErsatzSpace | Space;
  invitationUrl?: string;
  authCode?: string;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  DoneAction?: FC;
  SpaceManager?: FC<SpaceManagerProps>;
  InvitationManager?: FC<InvitationManagerProps>;
};

export type SpacePanelProps = Pick<SpacePanelImplProps, 'space'> &
  Partial<Omit<SpacePanelImplProps, 'send' | 'activeView' | 'space'>>;

export type SpacePanelHeadingProps = Pick<SpacePanelImplProps, 'titleId' | 'space' | 'onDone' | 'doneActionParent'>;

export type SpacePanelStepProps = Pick<
  SpacePanelImplProps,
  'space' | 'createInvitationUrl' | 'send' | 'onDone' | 'doneActionParent' | 'DoneAction'
> & {
  active?: boolean;
};
