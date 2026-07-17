//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
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
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCommentConfigModule({
    requires: CommentConfig.requires,
    provides: CommentConfig.provides,
    activate: CommentConfig,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addUndoMappingsModule({
    requires: UndoMappings.requires,
    provides: UndoMappings.provides,
    activate: UndoMappings,
  }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(SheetState),
    requires: SheetState.requires,
    provides: SheetState.provides,
    activate: SheetState,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ComputeGraphRegistry),
    requires: ComputeGraphRegistry.requires,
    provides: ComputeGraphRegistry.provides,
    activate: ComputeGraphRegistry,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(Markdown),
    requires: Markdown.requires,
    provides: Markdown.provides,
    activate: Markdown,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(AnchorSort),
    requires: AnchorSort.requires,
    provides: AnchorSort.provides,
    activate: AnchorSort,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SheetPlugin;
