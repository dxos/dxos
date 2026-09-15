//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { CallsCapabilities, CallsEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [CallsCapabilities.Manager],
  // The manager provider rides the client-initialized event, so the feature demand alone is
  // not enough for the pull to find it.
  activatesOn: ActivationEvent.allOf(CallsEvents.Start, ClientEvents.Initialized),
});
// CallManager/CallTransport move as a set with the ReactRoot: its components read the manager
// via strict useCapability, so the three must share an activation event. The manager's
// constructor and open() read `client.services`/`client.config` (initialized-only), which the
// startup pass no longer implies — the trio rides the client-initialized event instead.
// Browser-only, with the transport below: the manager drives a WebRTC session against the edge
// calling service and reads `runtime.services.edge.url` in its constructor, so activating it
// anywhere that config is absent fails the module and auto-disables the whole plugin.
export const CallManager = Capability.lazyModule(
  'CallManager',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, ClientCapabilities.IdentityService],
    provides: [CallsCapabilities.Manager],
    activatesOn: ClientEvents.Initialized,
    environments: [],
  },
  () => import('./call-manager.ts'),
);
export const CallTransport = Capability.lazyModule(
  'CallTransport',
  {
    requires: [ClientCapabilities.Client],
    provides: [CallsCapabilities.CallTransportProvider],
    activatesOn: ClientEvents.Initialized,
    environments: [],
  },
  () => import('./call-transport.ts'),
);
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root.ts'), {
  activatesOn: ClientEvents.Initialized,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.deckCompanion.activeCall', 'org.dxos.role.devtoolsOverview'],
});
export const Translations = AppCapability.translations(translations, { environments: ['node'] });
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
