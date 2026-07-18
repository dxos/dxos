//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorSort,
  AppGraphBuilder,
  CommentConfig,
  CreateObject,
  MarkdownSettings,
  MarkdownState,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
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
  AppPlugin.addSchemaModule<void>({ schema: [Markdown.Document, Text.Text] }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<void>({ translations: [...translations, ...editorTranslations] }),
  AppPlugin.addSettingsModule<void>({
    requires: MarkdownSettings.requires,
    provides: MarkdownSettings.provides,
    activate: MarkdownSettings,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(MarkdownState),
    requires: MarkdownState.requires,
    provides: MarkdownState.provides,
    activate: MarkdownState,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(AnchorSort),
    requires: AnchorSort.requires,
    provides: AnchorSort.provides,
    activate: AnchorSort,
  }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);

export default MarkdownPlugin;
