//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';
import { ViewState, ViewStateProps } from './ViewState';

export interface AdditionMethodSelectorProps extends ViewStateProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const AdditionMethodSelector = ({
  dispatch,
  availableIdentities,
  ...viewStateProps
}: AdditionMethodSelectorProps) => {
  const disabled = !viewStateProps.active;
  return (
    <ViewState {...viewStateProps}>
      <span>Addition method selector</span>
      <Button
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'create identity' })}
      >
        Create an identity
      </Button>
      <Button
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'accept device invitation' })}
      >
        Use an authed device
      </Button>
      <Button
        disabled={disabled}
        onClick={() => dispatch({ type: 'select addition method', method: 'restore identity' })}
      >
        Use a seed phrase
      </Button>
      {availableIdentities.length && (
        <Button disabled={disabled} onClick={() => dispatch({ type: 'deselect identity' })}>
          Back to identities
        </Button>
      )}
    </ViewState>
  );
};
