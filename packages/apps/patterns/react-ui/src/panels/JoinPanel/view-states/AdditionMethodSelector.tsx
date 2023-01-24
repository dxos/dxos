//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';
import { ViewState } from './ViewState';

export interface AdditionMethodSelectorProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const AdditionMethodSelector = ({ dispatch, availableIdentities }: AdditionMethodSelectorProps) => {
  return (
    <ViewState>
      <span>Addition method selector</span>
      <Button onClick={() => dispatch({ type: 'select addition method', method: 'create identity' })}>
        Create an identity
      </Button>
      <Button onClick={() => dispatch({ type: 'select addition method', method: 'accept device invitation' })}>
        Use an authed device
      </Button>
      <Button onClick={() => dispatch({ type: 'select addition method', method: 'restore identity' })}>
        Use a seed phrase
      </Button>
      {availableIdentities.length && (
        <Button onClick={() => dispatch({ type: 'deselect identity' })}>Back to identities</Button>
      )}
    </ViewState>
  );
};
