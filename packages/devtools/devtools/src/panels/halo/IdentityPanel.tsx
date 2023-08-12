//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client/halo';

import { JsonView, PanelContainer, Toolbar } from '../../components';
import { VaultSelector } from '../../containers';

const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <VaultSelector />
        </Toolbar>
      }
    >
      <JsonView data={{ ...identity, devices }} />
    </PanelContainer>
  );
};

export default IdentityPanel;
