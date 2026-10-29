//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { trim } from '@dxos/util';

import { CallsNamespace } from './src/namespace.ts';
import * as CallsCapabilities from './src/types/CallsCapabilities.ts';
import * as CallsEvents from './src/types/CallsEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CallsNamespace.key,
    name: 'Calls',
    author: 'DXOS',
    description: trim`
      Calls adds WebRTC video and audio conferencing to Composer. A call room is
      derived from the DXN of any host object — typically a Channel — so starting
      a call requires no extra setup beyond the object that already exists in your
      space. The live call surface (participant grid, media controls, lobby) runs
      as a deck companion alongside the chat view so chat and video are
      independently scrollable and neither displaces the other.

      The plugin owns a CallManager capability that manages the WebRTC session for
      the lifetime of the client: joining a room, publishing local audio, video,
      and screenshare tracks to the Cloudflare Calls SFU, pulling remote tracks,
      and maintaining per-participant state (speaking detection, hand raise, pin).
      Peer discovery and track negotiation happen over DXOS swarm signalling so
      calls work without any additional signalling infrastructure.

      A pluggable Extension capability lets other plugins react to call lifecycle
      events (join, leave, media state changes) without being coupled to
      plugin-calls. plugin-transcription uses this contract to start recording and
      transcription when a call begins and persist the
      artefacts when it ends. A display-name gate prevents users without a profile
      from joining; the Lobby component prompts for a name and resumes the join
      flow automatically on save.

      plugin-calls is fully independent of plugin-thread at runtime: the "Start
      video call" action is contributed to Channel articles via a graph
      type-extension, so plugin-thread renders chat-only without error when
      plugin-calls is absent. The devtools surface exposes live CallState,
      MediaState, and raw WebRTC stats from @peermetrics/webrtc-stats for
      diagnostic use.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-calls',
    icon: { key: 'ph--video-conference--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [CallsCapabilities.Manager],
        // The manager provider rides the client-initialized event, so the feature demand alone is
        // not enough for the pull to find it.
        activatesOn: ActivationEvent.allOf(CallsEvents.Start, ClientEvents.Initialized),
      },
    ),
    // CallManager/CallTransport move as a set with the ReactRoot: its components read the manager
    // via strict useCapability, so the three must share an activation event. The manager's
    // constructor and open() read `client.services`/`client.config` (initialized-only), which the
    // startup pass no longer implies — the trio rides the client-initialized event instead.
    // Browser-only, with the transport below: the manager drives a WebRTC session against the edge
    // calling service and reads `runtime.services.edge.url` in its constructor, so activating it
    // anywhere that config is absent fails the module and auto-disables the whole plugin.
    Capability.lazyModule(
      'CallManager',
      {
        requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, ClientCapabilities.IdentityService],
        provides: [CallsCapabilities.Manager],
        activatesOn: ClientEvents.Initialized,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/call-manager.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'CallTransport',
      {
        requires: [ClientCapabilities.Client],
        provides: [CallsCapabilities.CallTransportProvider],
        activatesOn: ClientEvents.Initialized,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/call-transport.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: CallsNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.reactRoot(() => import('./src/capabilities/react-root.ts', { with: { type: 'module-url' } }), {
      activatesOn: ClientEvents.Initialized,
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.deckCompanion.activeCall', 'org.dxos.role.devtoolsOverview'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
