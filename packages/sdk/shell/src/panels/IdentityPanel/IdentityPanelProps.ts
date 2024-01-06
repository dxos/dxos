//
// Copyright 2023 DXOS.org
//

import { type cloneElement } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import type { Identity } from '@dxos/react-client/halo';
import { type InvitationStatus } from '@dxos/react-client/invitations';

import { type IdentityEvent } from './identityMachine';
import { type InvitationManagerProps } from '../../steps';

export type IdentityPanelImplProps = {
  titleId: string;
  activeView: 'device manager' | 'update profile form' | 'device invitation manager' | 'identity action chooser';
  identity: Identity;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  createInvitationUrl: (invitationCode: string) => string;
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  invitationUrl?: string;
  IdentityActionChooser?: React.FC<IdentityPanelStepProps>;
  InvitationManager?: React.FC<InvitationManagerProps>;
} & Partial<InvitationStatus>;

export type IdentityPanelProps = Partial<Omit<IdentityPanelImplProps, 'send' | 'activeView' | 'identity'>>;

export type IdentityPanelHeadingProps = Pick<IdentityPanelImplProps, 'titleId' | 'identity' | 'onDone'> & {
  title: string;
};

export type IdentityPanelStepProps = Pick<IdentityPanelImplProps, 'send' | 'onDone' | 'doneActionParent'> & {
  active?: boolean;
};
