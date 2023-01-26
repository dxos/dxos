//
// Copyright 2023 DXOS.org
//

import { Dispatch } from 'react';

import type { CancellableInvitationObservable, Profile as NaturalProfile, Space as NaturalSpace } from '@dxos/client';

export type Space = Pick<NaturalSpace, 'properties'>;

export type Profile = Pick<NaturalProfile, 'displayName' | 'identityKey'>;

export interface JoinPanelProps {
  initialInvitation?: CancellableInvitationObservable;
}

export interface IdentityAction {
  type: 'select identity' | 'added identity';
  identity: Profile;
}

export interface EmptyJoinAction {
  type: 'deselect identity' | 'cancel addition' | 'add identity';
}

export interface InvitationAction {
  type:
    | 'authenticating invitation'
    | 'cancel invitation'
    | 'connect invitation'
    | 'connecting invitation'
    | 'fail invitation'
    | 'accepted invitation'
    | 'timeout invitation';
  from: 'space' | 'halo';
}

export interface AdditionMethodAction {
  type: 'select addition method';
  method: 'restore identity' | 'accept device invitation' | 'create identity';
}

export type JoinAction = IdentityAction | EmptyJoinAction | AdditionMethodAction | InvitationAction;

export type JoinDispatch = Dispatch<JoinAction>;

export type InvitationView = 'invitation connector' | 'invitation authenticator' | 'invitation accepted';

export type JoinView =
  | 'identity selector'
  | 'addition method selector'
  | 'identity restorer'
  | 'identity creator'
  | 'identity added'
  | 'space invitation acceptor'
  | 'halo invitation acceptor';

export interface JoinState {
  activeView: JoinView;
  spaceInvitation?: CancellableInvitationObservable;
  spaceViewState: InvitationView;
  haloInvitation?: CancellableInvitationObservable;
  haloViewState: InvitationView;
  selectedIdentity?: Profile;
  additionMethod?: AdditionMethodAction['method'];
}
