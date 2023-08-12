//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';

import { JsonView, PanelContainer, Toolbar } from '../../components';
import { VaultSelector } from '../../containers';

const ConfigPanel = () => {
  const config = useConfig();

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <VaultSelector />
        </Toolbar>
      }
    >
      <JsonView data={config.values} />
    </PanelContainer>
  );
};

export default ConfigPanel;
