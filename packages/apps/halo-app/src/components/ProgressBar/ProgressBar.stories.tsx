//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ProgressBar } from './ProgressBar';

export default {
  component: ProgressBar,
  decorators: [withTheme],
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return (
    <div className='flex flex-col gap-5'>
      <ProgressBar progress={0} {...props} />
      <ProgressBar progress={0.3} {...props} />
      <ProgressBar progress={0.7} {...props} />
      <ProgressBar progress={1} {...props} />
    </div>
  );
};

export const Indeterminate = (props: any) => {
  return (
    <>
      <ProgressBar className='m-4' indeterminate {...props} />
    </>
  );
};
