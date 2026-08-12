//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorResolver,
  AnchorSort,
  CommentConfig,
  CreateObject,
  MarkdownSettings,
  MarkdownState,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations([...translations, ...editorTranslations])),
  Plugin.addModule(MarkdownSettings),
  Plugin.addModule(MarkdownState),
  Plugin.addModule(AnchorSort),
  Plugin.addModule(AnchorResolver),
  Plugin.make,
);

export default MarkdownPlugin;
