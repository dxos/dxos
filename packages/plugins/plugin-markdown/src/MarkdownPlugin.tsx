//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorSort,
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
import { Markdown, MarkdownEvents } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
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
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    // Migration bridge: Batch-5 consumer plugins still contribute extension providers via
    // `activatesOn: MarkdownEvents.SetupExtensions`; the ExtensionProvider capability is a live
    // (multi) view read reactively by the surface's Container component, so firing after
    // activation is safe — contributions still show up whenever they land.
    compatFires: [MarkdownEvents.SetupExtensions],
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...editorTranslations] }),
  AppPlugin.addSettingsModule({
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
  Plugin.make,
);

export default MarkdownPlugin;
