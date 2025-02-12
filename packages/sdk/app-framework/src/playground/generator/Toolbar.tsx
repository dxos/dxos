//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { createGeneratorIntent, createPluginId, Number } from './generator';
import { Capabilities } from '../../common';
import { contributes } from '../../core';
import { createIntent } from '../../plugin-intent';
import { useCapabilities, useIntentDispatcher, usePluginManager } from '../../react';

export const Toolbar = () => {
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleAdd = useCallback(async () => {
    const id = createPluginId(Math.random().toString(16).substring(2, 8));
    await manager.add(id);
  }, [manager]);

  const handleReset = useCallback(() => {}, []);

  const count = useCapabilities(Number).reduce((acc, curr) => acc + curr, 0);

  const generatorPlugins = manager.plugins.filter((plugin) => plugin.meta.id.startsWith('dxos.org/test/generator/'));

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      {/* NOTE: With the current plugins in the playground, this will never be enabled. */}
      <Button disabled={manager.pendingReset.length === 0} onClick={handleReset}>
        Reset
      </Button>
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
  contributes(Capabilities.ReactSurface, {
    id: 'dxos.org/test/generator/toolbar',
    role: 'toolbar',
    component: Toolbar,
  });
