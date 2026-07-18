//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CreateObject,
  HelpState,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  SkillDefinition,
  SupportSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Support, SupportOperation, type Tour } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export type SupportPluginOptions = { helpSteps?: Tour.Step[] };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule<SupportPluginOptions, typeof AppGraphBuilder.requires>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule<SupportPluginOptions>({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule<SupportPluginOptions>({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule<SupportPluginOptions>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule<SupportPluginOptions>({ schema: [Support.Ticket] }),
  AppPlugin.addSurfaceModule<SupportPluginOptions>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<SupportPluginOptions>({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(HelpState),
    requires: HelpState.requires,
    provides: HelpState.provides,
    activate: HelpState,
  }),
  Plugin.addModule(({ helpSteps = [] }) => ({
    id: 'react-root',
    requires: ReactRoot.requires,
    provides: ReactRoot.provides,
    activate: () => ReactRoot(helpSteps),
  })),
  // Genuine runtime event: fired imperatively by `plugin-space`'s create-space operation.
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    provides: [SpaceCapabilities.OnCreateSpace],
    activate: () =>
      Effect.succeed([
        Capability.provide(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(SupportOperation.OnCreateSpace, params),
        ),
      ]),
  }),
  Plugin.addModule({
    id: 'settings',
    requires: SupportSettings.requires,
    provides: SupportSettings.provides,
    activate: SupportSettings,
  }),
  AppPlugin.addPluginAssetModule<SupportPluginOptions>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SupportPlugin;
