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

const Surface = ({
  children,
  level,
}: PropsWithChildren & { level: 'base' | 'group' | 'chrome' | 'fixed' | 'input' | 'accent' }) => {
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
      className={mx('flex justify-center items-center m-8 p-2 w-[320px] h-[160px] rounded-lg', ...surface)}
    >
      <div>{level}</div>
      {children}
    </div>
  );
};

const SurfacesStory = () => {
  return (
    <div className='bg-cubes p-10 m-0'>
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
