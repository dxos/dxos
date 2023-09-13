//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';
import { SingleOrArray, Event } from 'xstate';

import { Space } from '@dxos/react-client/echo';

import { SpaceManagerProps } from './steps';
import { InvitationManagerProps } from '../../steps';

export type ErsatzSpace = Pick<Space, 'key'> & Partial<Pick<Space, 'share'>> & { properties: { name?: string } };

export type SpacePanelImplProps = {
  titleId: string;
  activeView: string;
  send: (event: SingleOrArray<Event<any>>) => void;
  createInvitationUrl: (invitationCode: string) => string;
  space: ErsatzSpace | Space;
  invitationUrl?: string;
  authCode?: string;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  DoneAction?: React.FC;
  SpaceManager?: React.FC<SpaceManagerProps>;
  InvitationManager?: React.FC<InvitationManagerProps>;
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
