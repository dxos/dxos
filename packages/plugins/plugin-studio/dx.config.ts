//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import * as StudioSurfaces from '#surfaces';

import { StudioNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StudioNamespace.key,
    name: 'Studio',
    author: 'DXOS',
    description: trim`
      Studio is a creative-artifact tool for Composer. An Artifact is a media-agnostic unit of creative work — a
      prompt paired with the variants generated (or uploaded) from it — spanning images, video, and future media,
      discriminated by an open-string kind. The user authors the prompt, runs generation against a pluggable,
      kind-specific provider, and reviews the variants one at a time, all together in a gallery, or as cards.

      The plugin owns the cross-cutting ontology (Artifact / Variant / Generation) and the generic authoring UI;
      concrete media plug in as overridable renderer Surfaces (keyed by contentType) and providers register a
      GenerationService per kind (each with its own request schema). Providers such as plugin-ideogram manage their
      own credentials via the Connector system; credentialed access is resolved at generation time through
      CredentialsService, keyed by the provider's source.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-studio',
    icon: { key: 'ph--paint-brush--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    dependsOn: ['org.dxos.plugin.projects'],
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: StudioNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    // A cross-plugin contribution rides the consuming plugin's start event.
    Capability.lazyModule(
      'ProjectTemplates',
      { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
      () => import('./src/capabilities/project-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [StudioSurfaces.VariantRenderer, AppRole.Article, AppRole.CardContent],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
