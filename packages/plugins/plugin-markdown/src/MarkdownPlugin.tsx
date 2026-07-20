//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorSort,
  CommentConfig,
  CreateObject,
  HistoryProvider,
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
  // Opts documents into the generic history companion contributed by plugin-space.
  Plugin.addLazyModule(HistoryProvider),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...editorTranslations])),
  Plugin.addLazyModule(MarkdownSettings),
  Plugin.addLazyModule(MarkdownState),
  Plugin.addLazyModule(AnchorSort),
  Plugin.make,
);

export default MarkdownPlugin;
