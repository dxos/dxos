//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as CallsEvents from '@dxos/plugin-calls/CallsEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { MeetingCapabilities, MeetingEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  // Call manager read optionally in the body (absence-guarded atom) — see plugin-thread's note.
  requires: [MeetingCapabilities.State, Capabilities.OperationInvoker],
});
export const CallExtension = Capability.lazyModule(
  'CallExtension',
  {
    requires: [MeetingCapabilities.State],
    provides: [CallsCapabilities.EventHandler],
    // Both features must be live: the handler extends calls but reads meeting state.
    activatesOn: ActivationEvent.allOf(CallsEvents.Start, MeetingEvents.Start),
  },
  () => import('./call-extension'),
);
export const MeetingSettings = Capability.lazyModule(
  'MeetingSettings',
  { provides: [MeetingCapabilities.SettingsAtom], activatesOn: MeetingEvents.Start },
  () => import('./settings'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const MeetingState = Capability.lazyModule(
  'MeetingState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [MeetingCapabilities.State],
    activatesOn: MeetingEvents.Start,
  },
  () => import('./state'),
);
export const Schema = AppCapability.schema(() => import('./schema'));
export const Translations = AppCapability.translations(translations);
