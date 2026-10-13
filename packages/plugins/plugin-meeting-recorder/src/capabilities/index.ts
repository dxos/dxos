//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { MeetingRecorderCapabilities, MeetingRecorderEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Bridge = Capability.lazyModule(
  'Bridge',
  { provides: [MeetingRecorderCapabilities.Bridge], activatesOn: MeetingRecorderEvents.Start },
  () => import('./bridge.ts'),
);
// Detection is a background listener with no surface to gate it; it starts once a space exists for
// a detected meeting to be recorded into.
export const Detector = Capability.lazyModule(
  'Detector',
  {
    requires: [Capabilities.OperationInvoker, MeetingRecorderCapabilities.Bridge],
    provides: [],
    activatesOn: ClientEvents.SpacesAvailable,
  },
  () => import('./detector.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.statusIndicator'],
});
export const Recorder = Capability.lazyModule(
  'Recorder',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [MeetingRecorderCapabilities.Recorder],
    activatesOn: MeetingRecorderEvents.Start,
  },
  () => import('./recorder.ts'),
);
export const RecorderSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [MeetingRecorderCapabilities.Settings],
});
export const RecorderState = Capability.lazyModule(
  'RecorderState',
  { provides: [MeetingRecorderCapabilities.State], activatesOn: MeetingRecorderEvents.Start },
  () => import('./state.ts'),
);
export const Translations = AppCapability.translations(translations);
