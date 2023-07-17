//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Testing as TestingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

export type TestingMainOptions = {
  readonly: boolean;
};

export const TestingMain: FC<{ data: [SpaceProxy, TestingType] }> = ({ data: [space, object] }) => {
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='h-screen'>TESTING</div>
    </Main.Content>
  );
};
