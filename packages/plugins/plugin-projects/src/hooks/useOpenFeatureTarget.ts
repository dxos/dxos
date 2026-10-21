//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database } from '@dxos/echo';
import * as RegistryPaths from '@dxos/plugin-registry/RegistryPaths';

import { Feature } from '#types';

import { type FeatureTarget } from '../components/FeatureCard/feature.ts';
import { useOpenObject } from './useOpenObject.ts';

/**
 * Opens what a feature card links to: an object beside `attendableId`; a spec as the space's imported copy, else
 * rendered in the app from the copy a plugin bundles, else on GitHub.
 */
export const useOpenFeatureTarget = (db: Database.Database | undefined, attendableId: string | undefined) => {
  const manager = PluginManagerProvider.usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { invokePromise } = Hooks.useOperationInvoker();
  const openObject = useOpenObject(db, attendableId);
  return useCallback(
    (target: FeatureTarget) => {
      if (target.id) {
        void openObject(target.id);
        return;
      }
      if (target.type !== 'spec') {
        return;
      }
      const pluginKey = Feature.findSpecPlugin(
        target.path,
        plugins.map(({ meta }) => meta.profile),
      );
      if (pluginKey) {
        void invokePromise(LayoutOperation.Open, {
          subject: [RegistryPaths.getPluginSpecPath(pluginKey)],
          pivotId: RegistryPaths.getPluginPath(pluginKey),
          disposition: 'detail',
        });
      } else {
        window.open(Feature.getSpecUrl(target.path), '_blank', 'noopener,noreferrer');
      }
    },
    [plugins, invokePromise, openObject],
  );
};
