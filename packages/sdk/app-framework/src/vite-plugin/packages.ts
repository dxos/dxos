//
// Copyright 2026 DXOS.org
//

/**
 * Packages shared between the Composer host app and remote plugins.
 * The host provides these via import map so plugins don't bundle their own copies.
 * Used as the default list for both `importMapPlugin` (host) and `composerPlugin` (plugin).
 */
export const DEFAULT_PACKAGES = [
  '@dxos/app-framework',
  '@dxos/app-graph',
  '@dxos/app-toolkit',
  '@dxos/client',
  '@dxos/client-protocol',
  '@dxos/client-services',
  '@dxos/config',
  '@dxos/echo',
  '@dxos/lit-ui',
  '@dxos/react-client',
  '@dxos/react-ui',
  '@dxos/schema',
  '@dxos/ui-theme',
  '@effect/platform',
  'effect',
  'lit',
  'react',
  'react-dom',
];
