//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { CallsAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
// CallManager/CallTransport move as a set with the ReactRoot: its components read the manager
// via strict useCapability, so the three must share an activation event. The manager's
// constructor and open() read `client.services`/`client.config` (initialized-only), which the
// startup pass no longer implies — the trio rides the client-initialized event instead.
// Browser-only, with the transport below: the manager drives a WebRTC session against the edge
// calling service and reads `runtime.services.edge.url` in its constructor, so activating it
// anywhere that config is absent fails the module and auto-disables the whole plugin.
export { CallsCallManager as CallManager } from './call-manager.ts';
export { CallTransport } from './call-transport.ts';
export { ReactRoot } from './react-root.ts';
export { ReactSurface } from './react-surface.ts';
export const Translations = AppCapability.translations(translations, { environments: ['node'] });
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
