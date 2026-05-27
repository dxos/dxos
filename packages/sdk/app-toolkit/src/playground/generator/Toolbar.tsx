//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { Button } from '@dxos/react-ui';

import { Number, createAlertOperation, createPluginId } from './generator';

export const Toolbar = () => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { invokePromise } = useOperationInvoker();

  const handleAdd = useCallback(
    () =>
      Effect.gen(function* () {
        const id = createPluginId(Math.random().toString(16).substring(2, 8));
        yield* manager.add(id);
        yield* manager.enable(id);
      }).pipe(runAndForwardErrors),
    [manager],
  );

  const count = (useCapabilities(Number) as number[]).reduce((acc, curr) => acc + curr, 0);

  const prefix = 'org.dxos.test.generator.';
  const generatorPlugins = plugins.filter((plugin) => DXN.getName(plugin.meta.id).startsWith(prefix));

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      <div className='flex items-center'>Count: {count}</div>
      {generatorPlugins.map((plugin) => (
        <Button key={plugin.meta.id} onClick={() => invokePromise(createAlertOperation(plugin.meta.id))}>
          {DXN.getName(plugin.meta.id).replace(prefix, '')}
        </Button>
      ))}
    </>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: DXN.make('org.dxos.test.generator.toolbar'),
        role: 'toolbar',
        component: Toolbar,
      }),
    ),
  ),
);
