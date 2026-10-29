//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { trim } from '@dxos/util';

import { MeetingRecorderNamespace } from './src/namespace.ts';
import * as MeetingRecorderCapabilities from './src/types/MeetingRecorderCapabilities.ts';
import * as MeetingRecorderEvents from './src/types/MeetingRecorderEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MeetingRecorderNamespace.key,
    name: 'Meeting Recorder',
    author: 'DXOS',
    description: trim`
      Meeting notes for calls held in other apps, in the style of Granola.
      On Composer Desktop the recorder notices when Zoom, Google Meet, Microsoft Teams, FaceTime, Slack or any other app starts using the microphone and offers to take notes; one click (or none, with auto-start) creates a Meeting object and begins transcribing.

      Your microphone is transcribed as you and the system audio as the other participants, so the transcript reads as a conversation without anyone joining a bot to the call.
      When the other app releases the microphone the recording stops on its own and the Meeting plugin writes an AI summary of the transcript and your notes.

      In a browser, where other apps cannot be observed, recording still works from the microphone and is started by hand from the status bar or the command palette.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting-recorder',
    icon: { key: 'ph--record--regular', hue: 'red' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'Bridge',
      { provides: [MeetingRecorderCapabilities.Bridge], activatesOn: MeetingRecorderEvents.Start },
      () => import('./src/capabilities/bridge.ts', { with: { type: 'module-url' } }),
    ),
    // Detection is a background listener with no surface to gate it; it starts once a space exists for
    // a detected meeting to be recorded into.
    Capability.lazyModule(
      'Detector',
      {
        requires: [Capabilities.OperationInvoker, MeetingRecorderCapabilities.Bridge],
        provides: [],
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/detector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: MeetingRecorderNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.statusIndicator'],
    }),
    Capability.lazyModule(
      'Recorder',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [MeetingRecorderCapabilities.Recorder],
        activatesOn: MeetingRecorderEvents.Start,
      },
      () => import('./src/capabilities/recorder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [MeetingRecorderCapabilities.Settings],
    }),
    Capability.lazyModule(
      'RecorderState',
      { provides: [MeetingRecorderCapabilities.State], activatesOn: MeetingRecorderEvents.Start },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
