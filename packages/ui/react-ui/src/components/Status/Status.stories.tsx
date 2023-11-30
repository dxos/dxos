//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Status } from './Status';

export default {
  component: Status,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return (
    <div className='m-5 space-b-5'>
      <Status classNames='block' progress={0} {...props} />
      <Status classNames='block' progress={0.3} {...props} />
      <Status classNames='block' progress={0.7} {...props} />
      <Status classNames='block' progress={1} {...props} />
    </div>
  );
};

export const Indeterminate = (props: any) => {
  return (
    <div className='m-5'>
      <Status classNames='block' indeterminate {...props} />
    </div>
  );
};
