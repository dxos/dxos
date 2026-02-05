//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import * as Common from '../../common';
import { Capability, type Plugin } from '../../core';
import { useCapabilities, useOperationInvoker, usePluginManager } from '../../react';

import { Number, createAlertOperation, createPluginId } from './generator';

export const Toolbar = () => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { invokePromise } = useOperationInvoker();

  const handleAdd = useCallback(async () => {
    const id = createPluginId(Math.random().toString(16).substring(2, 8));
    await manager.add(id);
  }, [manager]);

  const count = useCapabilities(Number).reduce((acc: number, curr: number) => acc + curr, 0);

  const generatorPlugins = plugins.filter((plugin: Plugin.Plugin) =>
    plugin.meta.id.startsWith('dxos.org/test/generator/'),
  );

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      <div className='flex items-center'>Count: {count}</div>
      {generatorPlugins.map((plugin: Plugin.Plugin) => (
        <Button key={plugin.meta.id} onClick={() => invokePromise(createAlertOperation(plugin.meta.id))}>
          {plugin.meta.id.replace('dxos.org/test/generator/', '')}
        </Button>
      ))}
    </>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.ReactSurface,
      Common.createSurface({
        id: 'dxos.org/test/generator/toolbar',
        role: 'toolbar',
        component: Toolbar,
      }),
    ),
  ),
);
