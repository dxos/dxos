//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Toolbar } from '@dxos/react-ui';

import { JsonView, PanelContainer } from '../../../components';
import { VaultSelector } from '../../../containers';

export const ConfigPanel = () => {
  const config = useConfig();

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <VaultSelector />
        </Toolbar.Root>
      }
    >
      <JsonView data={config.values} />
    </PanelContainer>
  );
};
