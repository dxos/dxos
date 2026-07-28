//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { JsonView } from '../../../components';
import { VaultSelector } from '../../../containers';

export const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <VaultSelector />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <JsonView data={{ ...identity, devices }} />
      </Panel.Content>
    </Panel.Root>
  );
};
