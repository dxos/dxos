//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { PwaNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: PwaNamespace.key,
    name: 'PWA',
    author: 'DXOS',
    description: trim`
      Progressive Web App capabilities enabling offline functionality and app-like experience.
      Install to home screen and use the workspace without internet connection.
    `,
    tags: ['system'],
  },
  modules: [
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    Capability.lazyModule(
      'RegisterPwa',
      {
        requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry],
        provides: [AppCapabilities.UpdateManager],
      },
      () => import('./src/capabilities/register-pwa.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    // Separate from `RegisterPwa` so that an app without the progress registry still registers the
    // service worker — only the meter is lost, not the update flow itself.
    Capability.lazyModule(
      'UpdateProgress',
      { provides: [] },
      () => import('./src/capabilities/update-progress.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
