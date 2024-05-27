//
// Copyright 2023 DXOS.org
//

import { type cloneElement } from 'react';

import type { Identity } from '@dxos/react-client/halo';
import type { Invitation, AuthenticatingInvitationObservable, InvitationResult } from '@dxos/react-client/invitations';

import { type JoinSend } from './joinMachine';
import { type IdentityInputProps } from './steps';
import { type ConfirmResetProps, type StepProps } from '../../steps';
import { type FailReason } from '../../types';

export type JoinPanelMode = 'default' | 'halo-only';

export type JoinPanelInitialDisposition = 'default' | 'accept-halo-invitation';

export type JoinStepProps = Omit<StepProps, 'send' | 'onDone'> & {
  send: JoinSend;
  onDone?: (result: InvitationResult | null) => void;
};

export interface JoinPanelProps {
  mode?: JoinPanelMode;
  initialDisposition?: JoinPanelInitialDisposition;
  initialInvitationCode?: string;
  titleId?: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
  onDone?: (result: InvitationResult | null) => void;
  parseInvitationCodeInput?: (invitationCodeInput: string) => string;
  onCancelResetStorage?: () => void;
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
  invitationIds?: Partial<{
    Halo: string;
    Space: string;
  }>;
  invitationStates?: Partial<{
    Halo: Invitation.State;
    Space: Invitation.State;
  }>;
  succeededKeys?: Partial<{
    Halo: Set<string>;
    Space: Set<string>;
  }>;
  failReasons?: Partial<{
    Halo: FailReason | null;
    Space: FailReason | null;
  }>;
  onHaloDone?: () => void;
  onSpaceDone?: () => void;
  onHaloInvitationCancel?: () => Promise<void> | undefined;
  onSpaceInvitationCancel?: () => Promise<void> | undefined;
  onHaloInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
  onSpaceInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
  onConfirmResetStorage?: () => Promise<void>;
  onCancelResetStorage?: () => void;
  IdentityInput?: React.FC<IdentityInputProps>;
  ConfirmReset?: React.FC<ConfirmResetProps>;
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
