//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { ThreadNamespace } from './src/namespace.ts';
import * as ThreadCapabilities from './src/types/ThreadCapabilities.ts';
import * as ThreadEvents from './src/types/ThreadEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ThreadNamespace.key,
    name: 'Threads',
    author: 'DXOS',
    description: trim`
      ThreadPlugin provides chat: channels backed by an ECHO feed and free-standing
      message threads. It renders the channel article and companion surfaces plus a
      thread surface, and contributes the operations that create a default channel on
      space creation, create new channels, and append messages.

      Channel messages are stored in the channel's feed queue and rendered newest-last
      with a pinned composer; externally-synced channels (carrying foreign-key
      metadata, e.g. Slack/Discord-sourced rooms) render read-only because there is no
      local-write path back to the source. Free-standing threads render their messages
      and append by pushing onto the thread's message list.

      The shared message and thread UI comes from @dxos/react-ui-thread; the Channel,
      Message, and Thread schema come from @dxos/types. Document comments and the
      comment-thread AI agent live in the @dxos/plugin-review plugin.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
    icon: { key: 'ph--video-conference--regular', hue: 'rose' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-qa-flows/plugin-thread-QA-1.webm' },
    ],
    tags: ['alpha'],
  },
  modules: [
    // The graph builder reads the call manager OPTIONALLY (reactive atom with an absence guard),
    // so no spec-level require: a hard cross-plugin require would fail this plugin whenever
    // plugin-calls is disabled. Cross-feature requires are only valid with a plugin-level dependsOn.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // Default local-feed channel backend. Other plugins contribute additional
    // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
    Capability.lazyModule(
      'ChannelBackendFeed',
      {
        provides: [ThreadCapabilities.ChannelBackend],
        activatesOn: ThreadEvents.Start,
        environments: ['browser', 'node', 'tauri', 'workerd'],
      },
      () => import('./src/capabilities/channel-backend-feed.ts', { with: { type: 'module-url' } }),
    ),
    // `CreateObjectEntry` carries a `customPanel` React component alongside the object factory, so it
    // cannot load without React — browser only.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri', 'workerd'], activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.pluginAsset({
      pluginId: ThreadNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
    AppCapability.translations(() => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
