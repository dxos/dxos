//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import { usePluginManager } from '@dxos/app-framework/PluginManagerProvider';
import { Surface } from '@dxos/app-framework/Surface';
import { EffectEx } from '@dxos/effect';
import { Button } from '@dxos/react-ui';

import { PlaygroundRoles } from '../roles.ts';
import { Number, createAlertOperation, createPluginId } from './generator.ts';

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
      }).pipe(EffectEx.runAndForwardErrors),
    [manager],
  );

  const count = (useCapabilities(Number) as number[]).reduce((acc, curr) => acc + curr, 0);

  const generatorPlugins = plugins.filter((plugin) => plugin.meta.profile.key.startsWith('org.dxos.test.generator.'));

  return (
    <>
      <Button onClick={handleAdd}>Add</Button>
      <div className='flex items-center'>Count: {count}</div>
      {generatorPlugins.map((plugin) => (
        <Button
          key={plugin.meta.profile.key}
          onClick={() => invokePromise(createAlertOperation(Plugin.getURI(plugin.meta)))}
        >
          {plugin.meta.profile.key.replace('org.dxos.test.generator.', '')}
        </Button>
      ))}
    </>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'org.dxos.test.generator.toolbar',
        filter: Surface.makeFilter(PlaygroundRoles.Toolbar),
        component: Toolbar,
      }),
    ),
  ),
);
