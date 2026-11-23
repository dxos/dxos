//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { trim } from '@dxos/util';

import { UmlNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: UmlNamespace.key,
    name: 'UML',
    author: 'DXOS',
    description: trim`
      UML for drawings: an assistant skill that draws class diagrams in any drawing,
      and a class shape (name, attributes and methods) for the canvas.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-uml',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--tree-structure--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    // Browser-only: the class shape carries a React view; it rides illustrator's start, as the canvas variant does.
    Capability.lazyModule(
      'class-node-type',
      {
        provides: [CanvasCapabilities.NodeType],
        activatesOn: IllustratorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/class-node-type.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri'] },
    ),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
