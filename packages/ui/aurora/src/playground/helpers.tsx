//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FunctionComponent } from 'react';

import { type Density } from '@dxos/aurora-types';

import { DensityProvider, ElevationProvider } from '../components';

// TODO(burdon): Grid: density, variant (context?), elevation.
export const createScenarios =
  (Component: FunctionComponent<any>) =>
  ({ ...props }) => {
    const densities: Density[] = ['coarse', 'fine'];
    return (
      <div className='flex flex-col space-y-8'>
        {densities.map((density) => (
          <div key={density}>
            <ElevationProvider elevation='chrome'>
              <DensityProvider density={density}>
                <label className='p-2 text-xs'>{density}</label>
                <Component {...props} />
              </DensityProvider>
            </ElevationProvider>
          </div>
        ))}
      </div>
    );
  };
