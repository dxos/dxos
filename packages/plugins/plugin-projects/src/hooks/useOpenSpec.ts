//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as RegistryPaths from '@dxos/plugin-registry/RegistryPaths';

import { Feature } from '#types';

/**
 * Opens a spec: rendered in the app from the copy a plugin bundles, when the spec path names one; otherwise on GitHub.
 */
export const useOpenSpec = () => {
  const manager = PluginManagerProvider.usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (spec: string) => {
      const pluginKey = Feature.findSpecPlugin(
        spec,
        plugins.map(({ meta }) => meta.profile),
      );
      if (pluginKey) {
        void invokePromise(LayoutOperation.Open, {
          subject: [RegistryPaths.getPluginSpecPath(pluginKey)],
          pivotId: RegistryPaths.getPluginPath(pluginKey),
          disposition: 'detail',
        });
      } else {
        window.open(Feature.getSpecUrl(spec), '_blank', 'noopener,noreferrer');
      }
    },
    [plugins, invokePromise],
  );
};
