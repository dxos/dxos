//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';

import { type BootstrapPluginsParams, PluginHost, SurfacePlugin, IntentPlugin } from './plugins';

/**
 * Expected usage is for this to be the entrypoint of the application.
 * Initializes plugins and renders the root components.
 *
 * @example
 * const fallback = <div>Initializing Plugins...</div>;
 * const App = createApp({ plugins, fallback });
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>,
 * );
 *
 * @param params.plugins List of plugin definitions to initialize.
 * @param params.fallback Fallback component to render while plugins are initializing.
 */
export const createApp = ({ plugins, fallback }: BootstrapPluginsParams) => {
  const host = PluginHost({
    plugins: [SurfacePlugin(), IntentPlugin(), ...plugins],
    fallback,
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
