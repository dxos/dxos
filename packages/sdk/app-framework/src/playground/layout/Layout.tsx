//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Common from '../../common';
import { Capability } from '../../core';
import { Surface } from '../../react';

export const Layout = () => {
  return (
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
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactRoot, {
      id: 'dxos.org/test/layout/root',
      root: Layout,
    }),
  ),
);
