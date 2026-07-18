//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AnchorSort,
  CommentConfig,
  ComputeGraphRegistry,
  CreateObject,
  Markdown,
  OperationHandler,
  ReactSurface,
  SheetState,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sheet } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule<void>({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCommentConfigModule<void>({
    requires: CommentConfig.requires,
    provides: CommentConfig.provides,
    activate: CommentConfig,
  }),
  AppPlugin.addCreateObjectModule<void>({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addUndoMappingsModule<void>({
    requires: UndoMappings.requires,
    provides: UndoMappings.provides,
    activate: UndoMappings,
  }),
  AppPlugin.addSchemaModule<void>({ schema: [Sheet.Sheet] }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  Plugin.addLazyModule(SheetState),
  Plugin.addLazyModule(ComputeGraphRegistry),
  Plugin.addLazyModule(Markdown),
  Plugin.addLazyModule(AnchorSort),
  AppPlugin.addPluginAssetModule<void>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SheetPlugin;
