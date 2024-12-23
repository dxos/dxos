//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Decorator } from '@storybook/react';
import React from 'react';

import { modalSurface, groupSurface, mx, surfaceShadow } from '@dxos/react-ui-theme';
import { type Density, type Elevation } from '@dxos/react-ui-types';

import { DensityProvider, ElevationProvider } from '../../components';

type Config = {
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
};

export const withVariants = ({
  elevations = [
    { elevation: 'base' },
    { elevation: 'positioned', surface: groupSurface },
    { elevation: 'dialog', surface: modalSurface },
  ],
  densities = ['coarse', 'fine'],
}: Config = {}): Decorator => {
  return (Story) => (
    <div className='flex flex-col gap-8'>
      {elevations.map(({ elevation, surface }) => (
        <ElevationProvider key={elevation} elevation={elevation}>
          <div className='flex flex-col gap-8'>
            {densities.map((density) => (
              <DensityProvider key={density} density={density}>
                <div className={mx('p-4 rounded-lg', surface, surfaceShadow({ elevation }))}>
                  <Story />
                </div>
              </DensityProvider>
            ))}
          </div>
        </ElevationProvider>
      ))}
    </div>
  );
};
