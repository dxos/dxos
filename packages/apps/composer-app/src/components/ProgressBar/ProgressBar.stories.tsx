//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { ProgressBar } from './ProgressBar';

export default {
  component: ProgressBar,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return (
    <>
      <ProgressBar className='m-4' progress={0} {...props} />
      <ProgressBar className='m-4' progress={0.3} {...props} />
      <ProgressBar className='m-4' progress={0.7} {...props} />
      <ProgressBar className='m-4' progress={1} {...props} />
    </>
  );
};

export const Indeterminate = (props: any) => {
  return (
    <>
      <ProgressBar className='m-4' indeterminate {...props} />
    </>
  );
};
