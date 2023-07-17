//
// Copyright 2023 DXOS.org
//

import { Play, Stop } from '@phosphor-icons/react';
import React, { FC, useContext, useMemo } from 'react';

import { Testing as TestingType } from '@braneframe/types';
import { Button, DensityProvider, Main } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { SpaceProxy } from '@dxos/client';

import { TestingContext } from '../props';
import { Generator } from './Generator';

export type TestingMainOptions = {
  readonly: boolean;
};

export const TestingMain: FC<{ data: [SpaceProxy, TestingType] }> = ({ data: [space, _] }) => {
  const objects = space.db?.query().objects;
  const data = {
    objects: objects?.length,
  };

  const generator = useMemo(() => {
    const generator = new Generator(space);
    void generator.initialize();
    return generator;
  }, [space]);

  const { running, start, stop } = useContext(TestingContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
    } else {
      start(() => generator.updateObject(), 500);
    }
  };

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='flex p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={handleToggleRunning}>
            {running ? <Stop className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>
          <Button onClick={() => generator.createObject()}>Create object</Button>
          <Button onClick={() => generator.updateObject()}>Update object</Button>
        </DensityProvider>
      </div>
      <div className='p-2'>
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    </Main.Content>
  );
};
