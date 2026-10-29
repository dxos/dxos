//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { VideoNamespace } from './src/namespace.ts';
import * as VideoEvents from './src/types/VideoEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: VideoNamespace.key,
    name: 'Video',
    author: 'DXOS',
    description: trim`
      Store videos and play them inline in DXOS Composer. Each Video object holds a name and a source
      URL that renders in an embedded player. A transcription operation calls a remote EDGE service to
      generate a transcript and links it back to the video as a text object.
    `,
    icon: { key: 'ph--video-camera--regular', hue: 'red' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-video',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: VideoEvents.Start,
      },
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: VideoNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Section, AppRole.Tabpanel],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
