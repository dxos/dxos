//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { PlaygroundRoles } from '../roles';

export const Layout = () => {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Surface.Surface type={PlaygroundRoles.Toolbar} />
      </div>
      <div className='flex gap-2'>
        <div className='flex-1'>
          <Surface.Surface type={PlaygroundRoles.Primary} limit={1} />
        </div>
        <div className='flex-1'>
          <Surface.Surface type={PlaygroundRoles.Secondary} limit={1} />
        </div>
      </div>
    </div>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactRoot, {
      id: 'org.dxos.test.layout.root',
      root: Layout,
    }),
  ]),
);
