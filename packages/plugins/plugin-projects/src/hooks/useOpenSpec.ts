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

/** Returns how a spec opens in the app, or undefined when it only opens on GitHub. */
export type SpecOpener = (spec: string) => (() => void) | undefined;

/**
 * Opens a plugin's spec rendered in the app, from the copy the plugin bundles, when a feature's spec path names it;
 * other specs keep their GitHub link.
 */
export const useOpenSpec = (): SpecOpener => {
  const manager = PluginManagerProvider.usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback<SpecOpener>(
    (spec) => {
      const pluginKey = Feature.findSpecPlugin(
        spec,
        plugins.map(({ meta }) => meta.profile),
      );
      return pluginKey
        ? () =>
            void invokePromise(LayoutOperation.Open, {
              subject: [RegistryPaths.getPluginSpecPath(pluginKey)],
              pivotId: RegistryPaths.getPluginPath(pluginKey),
              disposition: 'detail',
            })
        : undefined;
    },
    [plugins, invokePromise],
  );
};
