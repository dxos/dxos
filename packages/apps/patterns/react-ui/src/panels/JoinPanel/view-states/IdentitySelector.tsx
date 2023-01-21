//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';

export interface IdentitySelectorProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const IdentitySelector = ({ dispatch, availableIdentities }: IdentitySelectorProps) => {
  return (
    <div role='group'>
      <span>IdentitySelector</span>
      <Button
        onClick={() =>
          dispatch({
            type: 'select identity',
            identity: availableIdentities[0]
          })
        }
      >
        Continue
      </Button>
      <Button onClick={() => dispatch({ type: 'add identity' })}>Add</Button>
    </div>
  );
};
