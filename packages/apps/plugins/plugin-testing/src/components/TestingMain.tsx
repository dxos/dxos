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
  const objects = space.db?.query().objects;
  const data = {
    objects: objects?.length,
  };

  const handleGenerate = () => {};

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='p-2'>
        <Button onClick={handleGenerate}>Generate Data</Button>
      </div>
      <div className='p-2'>
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    </Main.Content>
  );
};
