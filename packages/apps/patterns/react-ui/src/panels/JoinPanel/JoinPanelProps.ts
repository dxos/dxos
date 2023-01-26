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

export interface AdditionMethodAction {
  type: 'select addition method';
  method: 'restore identity' | 'accept device invitation' | 'create identity';
}

export type JoinAction = IdentityAction | EmptyJoinAction | AdditionMethodAction;

export type JoinDispatch = Dispatch<JoinAction>;

export type JoinView =
  | 'identity selector'
  | 'addition method selector'
  | 'identity restorer'
  | 'identity creator'
  | 'identity added'
  | 'invitation connector'
  | 'invitation authenticator'
  | 'invitation accepted';

export interface JoinState {
  activeView: JoinView;
  spaceInvitation?: CancellableInvitationObservable;
  haloInvitation?: CancellableInvitationObservable;
  selectedIdentity?: Profile;
  additionMethod?: AdditionMethodAction['method'];
}
