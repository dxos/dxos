//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { trim } from '@dxos/util';

import { ExcalidrawNamespace } from './src/namespace.ts';
import * as ExcalidrawCapabilities from './src/types/ExcalidrawCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ExcalidrawNamespace.key,
    name: 'Excalidraw',
    author: 'DXOS',
    description: trim`
      Professional diagramming powered by Excalidraw for creating hand-drawn style illustrations.
      Build flowcharts, wireframes, and technical diagrams with a rich set of shapes and styling options.

      Each Excalidraw object owns a Canvas whose elements are stored as a plain JSON record in ECHO,
      so edits replicate peer-to-peer in real time and merge automatically when collaborators
      reconnect, using ECHO's CRDT semantics.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-excalidraw',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    tags: ['labs'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-excalidraw-dark.png' }],
  },
  modules: [
    // Browser-only: the variant supplies the React article/card components that render a drawing.
    Capability.lazyModule(
      'drawing-variant',
      {
        provides: [IllustratorCapabilities.VariantProvider],
        activatesOn: IllustratorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/drawing-variant.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [ExcalidrawCapabilities.Settings],
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
