//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';

import { type HostPluginParams, Plugin, HostPlugin } from './plugins';
import IntentMeta from './plugins/plugin-intent/meta';
import SurfaceMeta from './plugins/plugin-surface/meta';

/**
 * Expected usage is for this to be the entrypoint of the application.
 * Initializes plugins and renders the root components.
 *
 * @example
 * const meta = [LayoutMeta, MyPluginMeta];
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
 * @param params.plugins All plugins available to the application.
 * @param params.meta All plugin metadata.
 * @param params.core Core plugins which will always be enabled.
 * @param params.defaults Default plugins are enabled by default but can be disabled by the user.
 * @param params.fallback Fallback component to render while plugins are initializing.
 */
export const createApp = ({ meta, plugins, core, ...params }: HostPluginParams) => {
  const hostPlugin = HostPlugin({
    plugins: {
      ...plugins,
      [IntentMeta.id]: Plugin.lazy(() => import('./plugins/plugin-intent')),
      [SurfaceMeta.id]: Plugin.lazy(() => import('./plugins/plugin-surface')),
    },
    // TODO(burdon): Why not include in core?
    meta: [SurfaceMeta, IntentMeta, ...meta],
    core: [SurfaceMeta.id, IntentMeta.id, ...core],
    ...params,
  });

  invariant(hostPlugin.provides);
  const { context: Context, root: Root } = hostPlugin.provides;
  invariant(Context);
  invariant(Root);

  return () => (
    <Context>
      <Root />
    </Context>
  );
};
