//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/react-ui';
import { useDevices, useIdentity } from '@dxos/react-client/halo';

import { JsonView, PanelContainer } from '../../../components';
import { VaultSelector } from '../../../containers';

export const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <VaultSelector />
        </Toolbar.Root>
      }
    >
      <JsonView data={{ ...identity, devices }} />
    </PanelContainer>
  );
};
