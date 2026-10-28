//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as AnimatorEvents from '@dxos/plugin-animator/AnimatorEvents';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

// Browser-only: the variant supplies the React article that renders a drawing.
export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  {
    provides: [IllustratorCapabilities.VariantProvider],
    activatesOn: IllustratorEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./drawing-variant.ts'),
);
// Where the canvas variant is: a conversion to it needs the variant too.
export const TldrawConverter = Capability.lazyModule(
  'tldraw-converter',
  {
    provides: [IllustratorCapabilities.Converter],
    activatesOn: IllustratorEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./tldraw-converter.ts'),
);
// The canvas as an animator stage, contributed when the animator starts; browser-only, as it renders.
export const AnimatorStage = Capability.lazyModule(
  'animator-stage',
  {
    provides: [AnimatorCapabilities.Stage],
    activatesOn: AnimatorEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./animator-stage.ts'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'CanvasMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations.ts'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const CanvasSettings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [CanvasCapabilities.Settings],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.tsx'), {
  roles: ['org.dxos.role.objectProperties'],
});
export const SpaceTemplates = AppCapability.spaceTemplates(() => import('./space-templates.ts'));
export const Translations = AppCapability.translations(translations);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'));
