//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as PresenterCapabilities from '@dxos/plugin-presenter/PresenterCapabilities';
import * as PresenterEvents from '@dxos/plugin-presenter/PresenterEvents';
import * as PresenterSurface from '@dxos/plugin-presenter/PresenterSurface';
import { trim } from '@dxos/util';

import { RecorderNamespace } from './src/namespace.ts';
import * as RecorderCapabilities from './src/types/RecorderCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: RecorderNamespace.key,
    name: 'Recorder',
    author: 'DXOS',
    description: trim`
      Record the voice-over of a presentation while you present it, reading each slide's speaker notes.
      Takes are kept with the presentation, with each slide's recorded length against its desired length.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-recorder',
    icon: { key: 'ph--record--regular', hue: 'red' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.presenter', 'org.dxos.plugin.file'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: RecorderNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [PresenterSurface.Toolbar, PresenterSurface.Overlay, AppRole.Article],
    }),
    // Rides the presenter's start event: the recorder is only reachable from a presentation.
    Capability.lazyModule(
      'Recorder',
      {
        provides: [RecorderCapabilities.Recorder, PresenterCapabilities.PresentationEventHandler],
        requires: [Capabilities.AtomRegistry, RecorderCapabilities.Settings],
        activatesOn: PresenterEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/recorder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [RecorderCapabilities.Settings],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
