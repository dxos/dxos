//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Toolbar } from '@dxos/react-ui';

import { JsonView, PanelContainer } from '../../../components';
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
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {vaultSelector && <VaultSelector />}
          {edgeSelector && <EdgeSelector />}
          {subductionSelector && <SubductionSelector />}
        </Toolbar.Root>
      }
    >
      <JsonView data={config.values} />
    </PanelContainer>
  );
};
