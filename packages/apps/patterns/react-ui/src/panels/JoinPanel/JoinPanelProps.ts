//
// Copyright 2023 DXOS.org
//

import { cloneElement, Dispatch } from 'react';

import type { AuthenticatingInvitationObservable, Profile } from '@dxos/client';
import { InvitationResult } from '@dxos/react-client';

export type JoinPanelMode = 'default' | 'halo-only';

export interface JoinPanelProps {
  mode?: JoinPanelMode;
  initialInvitationCode?: string;
  titleId?: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
  preventExit?: boolean;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
  parseInvitationCodeInput?: (invitationCodeInput: string) => string;
}

export interface IdentityAction {
  type: 'select identity' | 'added identity';
  identity: Profile;
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

export type JoinDispatch = Dispatch<JoinAction>;

export type InvitationView =
  | 'invitation input'
  | 'invitation rescuer'
  | 'invitation authenticator'
  | 'invitation accepted';

export type JoinView =
  | 'identity selector'
  | 'addition method selector'
  | 'identity input'
  | 'identity added'
  | 'space invitation acceptor'
  | 'halo invitation acceptor';

export interface JoinState {
  activeView: JoinView;
  unredeemedSpaceInvitationCode?: string;
  spaceInvitation?: AuthenticatingInvitationObservable;
  spaceViewState: InvitationView;
  spaceInvitationAnnotation?: 'authenticating' | 'authentication failed';
  unredeemedHaloInvitationCode?: string;
  haloInvitation?: AuthenticatingInvitationObservable;
  haloViewState: InvitationView;
  haloInvitationAnnotation?: 'authenticating' | 'authentication failed';
  selectedIdentity?: Profile;
  additionMethod?: AdditionMethodAction['method'];
}
