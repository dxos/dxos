//
// Copyright 2023 DXOS.org
//

import type { cloneElement } from 'react';
import type { Event, SingleOrArray } from 'xstate';

import type { Device, Identity } from '@dxos/react-client/halo';
import type { InvitationStatus } from '@dxos/react-client/invitations';
import type { ConnectionState } from '@dxos/react-client/mesh';

import type { IdentityEvent } from './identityMachine';
import { type AgentFormProps } from '../../components';
import type { InvitationManagerProps } from '../../steps';

export type IdentityPanelInitialDisposition = 'default' | 'manage-device-invitation' | 'manage-profile';

export type IdentityPanelImplProps = {
  titleId: string;
  activeView:
    | 'device manager'
    | 'agent manager'
    | 'update profile form'
    | 'device invitation manager'
    | 'identity action chooser'
    | 'confirm join new identity'
    | 'confirm reset storage';
  initialDisposition?: IdentityPanelInitialDisposition;
  identity: Identity;
  devices: Device[];
  connectionState?: ConnectionState;
  onChangeConnectionState?: (nextState: ConnectionState) => Promise<void>;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  onResetStorage?: () => Promise<void>;
  onJoinNewIdentity?: () => Promise<void>;
  createInvitationUrl: (invitationCode: string) => string;
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  invitationUrl?: string;
  IdentityActionChooser?: React.FC<IdentityPanelStepProps>;
  InvitationManager?: React.FC<InvitationManagerProps>;
} & Partial<InvitationStatus> &
  Partial<AgentFormProps>;

export type IdentityPanelProps = Partial<Omit<IdentityPanelImplProps, 'send' | 'activeView' | 'identity'>>;

export type IdentityPanelHeadingProps = Pick<
  IdentityPanelImplProps,
  'titleId' | 'identity' | 'onDone' | 'onUpdateProfile' | 'connectionState' | 'onChangeConnectionState'
> & {
  title: string;
};

export type IdentityPanelStepProps = Pick<IdentityPanelImplProps, 'send' | 'onDone' | 'doneActionParent'> & {
  active?: boolean;
  agentHostingEnabled?: boolean;
  devices: Device[];
};
