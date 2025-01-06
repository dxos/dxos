//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { CountEvent, Number } from './generator';
import { Capabilities } from '../../common';
import { contributes } from '../../plugin';
import { usePluginManager } from '../../react';

export const Toolbar = () => {
  const manager = usePluginManager();

  const handleAdd = useCallback(async () => {
    const id = Math.random().toString(16).substring(2, 8);
    await manager.add(id);
    await manager.activate(CountEvent);
  }, [manager]);

  const count = manager.context.requestCapability(Number).reduce((acc, curr) => acc + curr, 0);

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      <div className='flex items-center'>Count: {count}</div>
    </>
  );
};

export default () =>
  contributes(Capabilities.ReactSurface, {
    id: 'dxos.org/test/generator/toolbar',
    role: 'toolbar',
    component: Toolbar,
  });
