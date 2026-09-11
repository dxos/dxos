//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Panel, Toolbar } from '@dxos/react-ui';

import { JsonView } from '../../../components/index.ts';
import { EdgeSelector, VaultSelector } from '../../../containers/index.ts';

type ConfigPanelProps = {
  vaultSelector?: boolean;
  edgeSelector?: boolean;
};

export const ConfigPanel = ({ vaultSelector = true, edgeSelector = true }: ConfigPanelProps) => {
  const config = useConfig();

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {vaultSelector && <VaultSelector />}
          {edgeSelector && <EdgeSelector />}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <JsonView data={config.values} />
      </Panel.Content>
    </Panel.Root>
  );
};
