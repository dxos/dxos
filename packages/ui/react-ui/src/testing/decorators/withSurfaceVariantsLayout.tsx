//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { mx, surfaceShadow } from '@dxos/react-ui-theme';
import { type Density, type Elevation } from '@dxos/react-ui-types';

type Config = {
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
};

export const withSurfaceVariantsLayout = ({
  elevations = [
    { elevation: 'base', surface: 'bg-baseSurface' },
    { elevation: 'positioned', surface: 'bg-cardSurface' },
    { elevation: 'dialog', surface: 'bg-modalSurface' },
  ],
  densities = ['coarse'],
}: Config = {}): Decorator => {
  return (Story) => (
    <div className='fixed inset-0 grid grid-cols-2 grid-rows-[min-content] overflow-y-auto'>
      <div className='light p-4'>
        {elevations.map(({ elevation, surface }) =>
          densities.map((density) => (
            <div
              key={`${elevation}--${density}`}
              className={mx('p-4 mlb-4 rounded-md border border-separator', surface, surfaceShadow({ elevation }))}
            >
              <Story />
            </div>
          )),
        )}
      </div>
      <div className='dark p-4'>
        {elevations.map(({ elevation, surface }) =>
          densities.map((density) => (
            <div
              key={`${elevation}--${density}`}
              className={mx('p-4 mlb-4 rounded-md border border-separator', surface, surfaceShadow({ elevation }))}
            >
              <Story />
            </div>
          )),
        )}
      </div>
    </div>
  );
};
