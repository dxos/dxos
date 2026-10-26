//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as PresenterCapabilities from '@dxos/plugin-presenter/PresenterCapabilities';
import * as PresenterEvents from '@dxos/plugin-presenter/PresenterEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { RecorderCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
// Rides the presenter's start event: the recorder is only reachable from a presentation.
export const Recorder = Capability.lazyModule(
  'Recorder',
  {
    provides: [RecorderCapabilities.Recorder, PresenterCapabilities.PresentationEventHandler],
    requires: [Capabilities.AtomRegistry, RecorderCapabilities.Settings],
    activatesOn: PresenterEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./recorder.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.plugin.presenter.role.toolbar', 'org.dxos.plugin.presenter.role.overlay', 'org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [RecorderCapabilities.Settings],
});
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'));
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
