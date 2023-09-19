//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';

import type { Identity } from '@dxos/react-client/halo';
import type { Invitation, AuthenticatingInvitationObservable, InvitationResult } from '@dxos/react-client/invitations';

import { JoinSend } from './joinMachine';
import { IdentityInputProps } from './steps';
import { StepProps } from '../../steps';

export type JoinPanelMode = 'default' | 'halo-only';

export type JoinStepProps = Omit<StepProps, 'send' | 'onDone'> & {
  send: JoinSend;
  onDone?: (result: InvitationResult | null) => void;
};

export interface JoinPanelProps {
  mode?: JoinPanelMode;
  initialInvitationCode?: string;
  titleId?: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
  onDone?: (result: InvitationResult | null) => void;
  parseInvitationCodeInput?: (invitationCodeInput: string) => string;
}

export type JoinPanelImplProps = Pick<
  JoinPanelProps,
  'mode' | 'onExit' | 'onDone' | 'exitActionParent' | 'doneActionParent'
> & {
  send: JoinSend;
  titleId: string;
  activeView: string;
  failed: Set<'Halo' | 'Space'>;
  pending: boolean;
  unredeemedCodes?: Partial<{
    Halo: string;
    Space: string;
  }>;
  invitationStates?: Partial<{
    Halo: Invitation.State;
    Space: Invitation.State;
  }>;
  onHaloDone?: () => void;
  onSpaceDone?: () => void;
  onHaloInvitationCancel?: () => Promise<void> | undefined;
  onSpaceInvitationCancel?: () => Promise<void> | undefined;
  onHaloInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
  onSpaceInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
  IdentityInput?: React.FC<IdentityInputProps>;
};

export interface IdentityAction {
  type: 'select identity' | 'added identity';
  identity: Identity;
}

export interface EmptyJoinAction {
  type: 'deselect identity' | 'cancel addition' | 'add identity';
}

export interface EmptyInvitationAction {
  type:
    | 'authenticating invitation'
    | 'authenticate invitation'
    | 'cancel invitation'
    | 'cancelled invitation'
    | 'connect invitation'
    | 'fail invitation'
    | 'accepted invitation'
    | 'timeout invitation'
    | 'reset invitation';
  from: 'space' | 'halo';
}

export interface InvitationCodeAction {
  type: 'connecting invitation';
  from: 'space' | 'halo';
  invitation: AuthenticatingInvitationObservable;
}

export type InvitationAction = EmptyInvitationAction | InvitationCodeAction;

export interface AdditionMethodAction {
  type: 'select addition method';
  method: 'recover identity' | 'accept device invitation' | 'create identity';
}

export type JoinAction = IdentityAction | EmptyJoinAction | AdditionMethodAction | InvitationAction;

export type InvitationView =
  | 'invitation input'
  | 'invitation rescuer'
  | 'invitation authenticator'
  | 'invitation accepted';

export type JoinView =
  | 'identity selector'
  | 'addition method chooser'
  | 'identity input'
  | 'identity added'
  | 'space invitation acceptor'
  | 'halo invitation acceptor';

export interface JoinStateContext {
  activeView: JoinView;
  unredeemedSpaceInvitationCode?: string;
  spaceInvitation?: AuthenticatingInvitationObservable;
  spaceViewState: InvitationView;
  spaceInvitationAnnotation?: 'authenticating' | 'authentication failed';
  unredeemedHaloInvitationCode?: string;
  haloInvitation?: AuthenticatingInvitationObservable;
  haloViewState: InvitationView;
  haloInvitationAnnotation?: 'authenticating' | 'authentication failed';
  selectedIdentity?: Identity;
  additionMethod?: AdditionMethodAction['method'];
}
