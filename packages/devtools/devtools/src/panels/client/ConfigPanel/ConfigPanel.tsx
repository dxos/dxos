//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Panel, Toolbar } from '@dxos/react-ui';

import { JsonView } from '../../../components';
import { EdgeSelector, SubductionSelector, VaultSelector } from '../../../containers';

type ConfigPanelProps = {
  vaultSelector?: boolean;
  edgeSelector?: boolean;
  subductionSelector?: boolean;
};

export const ConfigPanel = ({
  vaultSelector = true,
  edgeSelector = true,
  subductionSelector = true,
}: ConfigPanelProps) => {
  const config = useConfig();

  return (
    <Panel.Root classNames='bs-full'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {vaultSelector && <VaultSelector />}
          {edgeSelector && <EdgeSelector />}
          {subductionSelector && <SubductionSelector />}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='overflow-auto'>
        <JsonView data={config.values} />
      </Panel.Content>
    </Panel.Root>
  );
};
