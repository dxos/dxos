//
// Copyright 2023 DXOS.org
//

import { Play, HandPalm } from '@phosphor-icons/react';
import React, { FC, useContext, useEffect, useMemo, useState } from 'react';

import { Testing as TestingType } from '@braneframe/types';
import { Button, DensityProvider, Main } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { diagnostics, SpaceProxy } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { TestingContext } from '../props';
import { Generator } from '../testing';

export const DEFAULT_PERIOD = 500;

export const TestingMain: FC<{ data: [SpaceProxy, TestingType] }> = ({ data: [space, _] }) => {
  const client = useClient();
  const [data, setData] = useState<any>({});
  const handleRefresh = async () => {
    // TODO(burdon): This currently hangs.
    const data = await diagnostics(client, { humanize: true, truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

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
      start(() => generator.updateObject(), DEFAULT_PERIOD);
    }
  };

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
  };

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='flex p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={handleToggleRunning}>
            {running ? <HandPalm className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>
          <Button onClick={() => generator.createObject()}>Create object</Button>
          <Button onClick={() => generator.updateObject()}>Update object</Button>
          <div className='grow' />
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleCreateEpoch}>Create epoch</Button>
        </DensityProvider>
      </div>
      <div className='p-2'>
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    </Main.Content>
  );
};
