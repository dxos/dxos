//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { PaperPlane } from '@phosphor-icons/react';
import React from 'react';

import { Button, DensityProvider, ElevationProvider, Input } from '../components';
import { defaultGroup, getSize } from '../styles';
import { mx } from '../util';

export default {
  component: DensityProvider
};

const ScenarioContent = (_props: {}) => (
  <>
    <Button>Text</Button>
    <Input
      label='excluded'
      variant='subdued'
      labelVisuallyHidden
      placeholder='Type something'
      defaultValue='Editable text'
    />
    <Button>
      <PaperPlane className={getSize(6)} />
    </Button>
  </>
);

const Scenario = (_props: {}) => (
  <>
    <div role='row' className={mx(defaultGroup({ elevation: 'group' }), 'flex gap-1 items-center p-0 mbe-4')}>
      <DensityProvider density='coarse'>
        <ElevationProvider elevation='chrome'>
          <ScenarioContent />
        </ElevationProvider>
      </DensityProvider>
    </div>
    <div role='row' className={mx(defaultGroup({ elevation: 'group' }), 'flex gap-1 items-center p-0')}>
      <DensityProvider density='fine'>
        <ElevationProvider elevation='chrome'>
          <ScenarioContent />
        </ElevationProvider>
      </DensityProvider>
    </div>
  </>
);

export const Default = {
  args: {},
  render: (_args: {}) => <Scenario />
};
