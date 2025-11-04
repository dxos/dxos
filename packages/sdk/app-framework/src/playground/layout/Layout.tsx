//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities } from '../../common';
import { contributes } from '../../core';
import { Surface } from '../../react';

export const Layout = () => (
  <div className='flex flex-col gap-2'>
    <div className='flex gap-2'>
      <Surface role='toolbar' />
    </div>
    <div className='flex gap-2'>
      <div className='flex-1'>
        <Surface role='primary' limit={1} />
      </div>
      <div className='flex-1'>
        <Surface role='secondary' limit={1} />
      </div>
    </div>
  </div>
);

export default () =>
  contributes(Capabilities.ReactRoot, {
    id: 'dxos.org/test/layout/root',
    root: Layout,
  });
