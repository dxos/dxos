//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { baseSurface, chromeSurface, groupSurface, mx } from '@dxos/aurora-theme';

const Panel = ({ children, level }: PropsWithChildren & { level: 'base' | 'group' | 'chrome' }) => {
  const surface = level === 'chrome' ? chromeSurface : level === 'group' ? groupSurface : baseSurface;
  return (
    <div className={mx('flex m-8 p-2 w-[320px] h-[160px] rounded-lg', surface)}>
      <div>{level}</div>
      {children}
    </div>
  );
};

const StylesStory = () => {
  return (
    <div>
      <Panel level='base' />
      <Panel level='group' />
      <Panel level='chrome' />
    </div>
  );
};

export default {
  component: StylesStory,
};

export const Default = {
  args: {},
};
