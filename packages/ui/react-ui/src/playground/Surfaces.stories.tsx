//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type PropsWithChildren } from 'react';

import { baseSurface, chromeSurface, groupSurface, glassSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

const Surface = ({ children, level }: PropsWithChildren & { level: 'base' | 'group' | 'chrome' | 'glass' }) => {
  const surface =
    level === 'chrome'
      ? [chromeSurface, surfaceElevation({ elevation: 'chrome' })]
      : level === 'group'
      ? [groupSurface, surfaceElevation({ elevation: 'group' })]
      : level === 'glass'
      ? [glassSurface, surfaceElevation({ elevation: 'chrome' })]
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
      <Surface level='base' />
      <Surface level='group' />
      <Surface level='chrome' />
      <Surface level='glass' />
    </div>
  );
};

export default {
  component: SurfacesStory,
};

export const Default = {
  args: {},
};
