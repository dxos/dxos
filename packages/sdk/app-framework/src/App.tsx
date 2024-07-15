//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';

import { type BootstrapPluginsParams, Plugin, PluginHost } from './plugins';
import IntentMeta from './plugins/IntentPlugin/meta';
import SurfaceMeta from './plugins/SurfacePlugin/meta';

/**
 * Expected usage is for this to be the entrypoint of the application.
 * Initializes plugins and renders the root components.
 *
 * @example
 * const order = [LayoutMeta, MyPluginMeta];
 * const plugins = {
 *  [LayoutMeta.id]: Plugin.lazy(() => import('./plugins/LayoutPlugin/plugin')),
 *  [MyPluginMeta.id]: Plugin.lazy(() => import('./plugins/MyPlugin/plugin')),
 * };
 * const core = [LayoutMeta.id];
 * const default = [MyPluginMeta.id];
 * const fallback = <div>Initializing Plugins...</div>;
 * const App = createApp({ order, plugins, core, default, fallback });
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>,
 * );
 *
 * @param params.order Total ordering of plugins.
 * @param params.plugins All plugins available to the application.
 * @param params.core Core plugins which will always be enabled.
 * @param params.default Default plugins are enabled by default but can be disabled by the user.
 * @param params.fallback Fallback component to render while plugins are initializing.
 */
export const createApp = ({ order, plugins, core = order.map(({ id }) => id), ...params }: BootstrapPluginsParams) => {
  const host = PluginHost({
    order: [SurfaceMeta, IntentMeta, ...order],
    plugins: {
      ...plugins,
      [SurfaceMeta.id]: Plugin.lazy(() => import('./plugins/SurfacePlugin/plugin')),
      [IntentMeta.id]: Plugin.lazy(() => import('./plugins/IntentPlugin/plugin')),
    },
    core: [SurfaceMeta.id, IntentMeta.id, ...core],
    ...params,
  });

  invariant(host.provides?.context);
  invariant(host.provides?.root);
  const Context = host.provides.context;
  const Root = host.provides.root;

  return () => (
    <Context>
      <Root />
    </Context>
  );
};
