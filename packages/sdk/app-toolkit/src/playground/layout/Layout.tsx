//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

export const Layout = () => {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Surface.Surface role='toolbar' />
      </div>
      <div className='flex gap-2'>
        <div className='flex-1'>
          <Surface.Surface role='primary' limit={1} />
        </div>
        <div className='flex-1'>
          <Surface.Surface role='secondary' limit={1} />
        </div>
      </div>
    </div>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactRoot, {
      id: 'dxos.org/test/layout/root',
      root: Layout,
    }),
  ),
);
