//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { PaperPlane } from '@phosphor-icons/react';
import React from 'react';

import { group, getSize, mx } from '@dxos/aurora-theme';

import { Button, DensityProvider, ElevationProvider } from '../components';

export default {
  component: DensityProvider,
};

const ScenarioContent = (_props: {}) => (
  <>
    <Button>Text</Button>
    {/* TODO(thure): Restore an Input here */}
    {/* <Input */}
    {/*  label='excluded' */}
    {/*  variant='subdued' */}
    {/*  labelVisuallyHidden */}
    {/*  placeholder='Type something' */}
    {/*  defaultValue='Editable text' */}
    {/* /> */}
    <Button>
      <PaperPlane className={getSize(6)} />
    </Button>
  </>
);

const Scenario = (_props: {}) => (
  <>
    <div role='row' className={mx(group({ elevation: 'group' }), 'flex gap-1 items-center p-0 mbe-4')}>
      <DensityProvider density='coarse'>
        <ElevationProvider elevation='chrome'>
          <ScenarioContent />
        </ElevationProvider>
      </DensityProvider>
    </div>
    <div role='row' className={mx(group({ elevation: 'group' }), 'flex gap-1 items-center p-0')}>
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
  render: (_args: {}) => <Scenario />,
};
