//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type PropsWithChildren } from 'react';

import { baseSurface, chromeSurface, groupSurface, mx, surfaceElevation } from '@dxos/aurora-theme';

const Surface = ({ children, level }: PropsWithChildren & { level: 'base' | 'group' | 'chrome' }) => {
  const surface =
    level === 'chrome'
      ? [chromeSurface, surfaceElevation({ elevation: 'chrome' })]
      : level === 'group'
      ? [groupSurface, surfaceElevation({ elevation: 'group' })]
      : [baseSurface];

  return (
    <div role='region' className={mx('flex m-8 p-2 w-[320px] h-[160px] rounded-lg', ...surface)}>
      <div>{level}</div>
      {children}
    </div>
  );
};

const SurfacesStory = () => {
  return (
    <>
      <Surface level='base' />
      <Surface level='group' />
      <Surface level='chrome' />
    </>
  );
};

export default {
  component: SurfacesStory,
};

export const Default = {
  args: {},
};
