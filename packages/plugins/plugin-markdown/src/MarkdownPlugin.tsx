//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CommentConfig),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...editorTranslations])),
  Plugin.addLazyModule(MarkdownSettings),
  Plugin.addLazyModule(MarkdownState),
  Plugin.addLazyModule(AnchorSort),
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.make,
);

export default MarkdownPlugin;
