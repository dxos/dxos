//
// Copyright 2023 DXOS.org
//

import { Dispatch } from 'react';

import type { Profile as NaturalProfile, Space as NaturalSpace } from '@dxos/client';

export type Space = Pick<NaturalSpace, 'properties'>;

export type Profile = Pick<NaturalProfile, 'displayName'>;

export interface JoinPanelProps {
  space: Space;
  availableIdentities: Profile[];
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
  | 'restore identity init'
  | 'accept device invitation'
  | 'create identity init'
  | 'identity added'
  | 'accept space invitation';

export interface JoinState {
  activeView: JoinView;
  space: Space;
  selectedIdentity?: Profile;
  additionMethod?: AdditionMethodAction['method'];
}
