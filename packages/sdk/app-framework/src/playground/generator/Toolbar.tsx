//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { Capabilities, createSurface } from '../../common';
import { contributes } from '../../core';
import { createIntent } from '../../plugin-intent';
import { useCapabilities, useIntentDispatcher, usePluginManager } from '../../react';

import { Number, createGeneratorIntent, createPluginId } from './generator';

export const Toolbar = () => {
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleAdd = useCallback(async () => {
    const id = createPluginId(Math.random().toString(16).substring(2, 8));
    await manager.add(id);
  }, [manager]);

  const count = useCapabilities(Number).reduce((acc, curr) => acc + curr, 0);

  const generatorPlugins = manager.plugins.filter((plugin) => plugin.meta.id.startsWith('dxos.org/test/generator/'));

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      <div className='flex items-center'>Count: {count}</div>
      {generatorPlugins.map((plugin) => (
        <Button key={plugin.meta.id} onClick={() => dispatch(createIntent(createGeneratorIntent(plugin.meta.id)))}>
          {plugin.meta.id.replace('dxos.org/test/generator/', '')}
        </Button>
      ))}
    </>
  );
};

export default () =>
  contributes(Capabilities.ReactSurface, createSurface({
    id: 'dxos.org/test/generator/toolbar',
    role: 'toolbar',
    component: Toolbar,
  }));
