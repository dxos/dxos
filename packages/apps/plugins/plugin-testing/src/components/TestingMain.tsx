//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Testing as TestingType } from '@braneframe/types';
import { Button, Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

export type TestingMainOptions = {
  readonly: boolean;
};

export const TestingMain: FC<{ data: [SpaceProxy, TestingType] }> = ({ data: [space, object] }) => {
  console.log(space.db);

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='p-2'>
        <Button>Generate Data</Button>
      </div>
    </Main.Content>
  );
};
