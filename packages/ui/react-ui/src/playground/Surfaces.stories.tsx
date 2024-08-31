//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type PropsWithChildren } from 'react';

import {
  baseSurface,
  modalSurface,
  groupSurface,
  mx,
  surfaceElevation,
  fixedSurface,
  fixedBorder,
  attentionSurface,
  accentSurface,
} from '@dxos/react-ui-theme';

import { withTheme } from '../testing';

type SurfaceLevel = 'base' | 'group' | 'chrome' | 'fixed' | 'input' | 'accent';

const Surface = ({ children, level }: PropsWithChildren & { level: SurfaceLevel }) => {
  const surface =
    level === 'chrome'
      ? [modalSurface, surfaceElevation({ elevation: 'chrome' })]
      : level === 'group'
        ? [groupSurface, surfaceElevation({ elevation: 'group' })]
        : level === 'input'
          ? [attentionSurface, surfaceElevation({ elevation: 'group' })]
          : level === 'fixed'
            ? [fixedSurface, fixedBorder, 'border', surfaceElevation({ elevation: 'chrome' })]
            : level === 'accent'
              ? [accentSurface, surfaceElevation({ elevation: 'chrome' })]
              : [baseSurface];

  return (
    <div
      role='region'
      className={mx('m-8 flex h-[160px] w-[320px] items-center justify-center rounded-lg p-2', ...surface)}
    >
      <div>{level}</div>
      {children}
    </div>
  );
};

const SurfacesStory = () => {
  return (
    <div className='bg-cubes m-0 p-10'>
      <Surface level='fixed' />
      <Surface level='base' />
      <Surface level='group' />
      <Surface level='chrome' />
      <Surface level='input' />
      <Surface level='accent' />
    </div>
  );
};

export default {
  title: 'react-ui/Scenarios/Surfaces',
  component: SurfacesStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
