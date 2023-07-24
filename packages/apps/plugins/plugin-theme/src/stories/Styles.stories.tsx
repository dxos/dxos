//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/aurora-theme';

import '@dxosTheme';

import { Styles } from '../styles';

const Panel = ({ children, level }: PropsWithChildren & { level: string }) => {
  const classes = (Styles as any)[level] as object;
  return (
    <div className={mx('flex m-8 p-2 w-[320px] h-[160px] rounded-lg', Object.values(classes).join(' '))}>
      <div>{level}</div>
      {children}
    </div>
  );
};

const StylesStory = () => {
  return (
    <div>
      <Panel level='level0' />
      <Panel level='level1' />
      <Panel level='level2' />
    </div>
  );
};

export default {
  component: StylesStory,
};

export const Default = {
  args: {},
};
