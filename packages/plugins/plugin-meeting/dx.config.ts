//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as CallsEvents from '@dxos/plugin-calls/CallsEvents';
import { trim } from '@dxos/util';

import { MeetingNamespace } from './src/namespace.ts';
import * as MeetingCapabilities from './src/types/MeetingCapabilities.ts';
import * as MeetingEvents from './src/types/MeetingEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MeetingNamespace.key,
    name: 'Meetings',
    author: 'DXOS',
    description: trim`
      Comprehensive meeting management that captures notes, generates real-time transcriptions, and produces AI-powered summaries of every session.
      Each meeting record stores an ISO-timestamped creation time, a list of participant identities, and three linked documents: a live transcript feed, a freeform markdown notes editor, and an AI-generated summary.

      The plugin integrates with the Calls plugin so that joining a call automatically opens a TranscriptionManager, routes the audio feed to a transcript object in ECHO, and synchronises the active meeting identity across all peers in the session.
      Participants can switch which meeting is active at any time, and the call layer propagates the selection via a typed activity payload so every peer stays in sync.

      AI summarisation sends the combined transcript and notes content to a language model, which returns a structured markdown document containing key discussion points, verbatim quotes, and a checklist of clearly assigned action items.
      The summary is written back to ECHO and replicated to all peers; the meeting article view displays a generate button on first use and a regenerate button once a summary exists.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
    icon: { key: 'ph--handshake--regular', hue: 'yellow' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    // TODO(wittjosiah): Needs new screenshots.
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-calls-dark.png' }],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        // Call manager read optionally in the body (absence-guarded atom) - see plugin-thread's note.
        requires: [MeetingCapabilities.State, Capabilities.OperationInvoker],
      },
    ),
    Capability.lazyModule(
      'CallExtension',
      {
        requires: [MeetingCapabilities.State],
        provides: [CallsCapabilities.EventHandler],
        // Both features must be live: the handler extends calls but reads meeting state.
        activatesOn: ActivationEvent.allOf(CallsEvents.Start, MeetingEvents.Start),
      },
      () => import('./src/capabilities/call-extension.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MeetingSettings',
      { provides: [MeetingCapabilities.SettingsAtom], activatesOn: MeetingEvents.Start },
      () => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MeetingState',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [MeetingCapabilities.State],
        activatesOn: MeetingEvents.Start,
      },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: MeetingNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
