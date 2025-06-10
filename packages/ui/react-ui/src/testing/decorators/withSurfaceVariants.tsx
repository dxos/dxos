//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Decorator } from '@storybook/react';
import React from 'react';

import { mx, surfaceShadow } from '@dxos/react-ui-theme';
import { type Density, type Elevation } from '@dxos/react-ui-types';

type Config = {
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
};

export const withSurfaceVariants = ({
  elevations = [
    { elevation: 'base', surface: 'bg-baseSurface' },
    { elevation: 'positioned', surface: 'bg-cardSurface' },
    { elevation: 'dialog', surface: 'bg-modalSurface' },
  ],
  densities = ['coarse'],
}: Config = {}): Decorator => {
  return (Story) => (
    <div className='grid grid-cols-2 gap-4'>
      <div className='light' data-token-root={true}>
        {elevations.map(({ elevation, surface }) =>
          densities.map((density) => (
            <div
              key={`${elevation}--${density}`}
              className={mx('p-4 mlb-4 rounded', surface, surfaceShadow({ elevation }))}
            >
              <Story />
            </div>
          )),
        )}
      </div>
      <div className='dark' data-token-root={true}>
        {elevations.map(({ elevation, surface }) =>
          densities.map((density) => (
            <div
              key={`${elevation}--${density}`}
              className={mx('p-4 mlb-4 rounded', surface, surfaceShadow({ elevation }))}
            >
              <Story />
            </div>
          )),
        )}
      </div>
    </div>
  );
};
