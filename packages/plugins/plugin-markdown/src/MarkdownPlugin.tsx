//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorSort,
  AppGraphBuilder,
  NavigationResolver,
  BlueprintDefinition,
  CommentConfig,
  CreateObject,
  MarkdownSettings,
  MarkdownState,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Markdown, MarkdownEvents } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCommentConfigModule({ activate: CommentConfig }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  AppPlugin.addSurfaceModule({
    activate: ReactSurface,
    firesBeforeActivation: [MarkdownEvents.SetupExtensions],
  }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...editorTranslations] }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: MarkdownSettings,
  }),
  Plugin.addModule({
    id: 'state',
    // Wait for AttentionEvents.AttentionReady so ViewStateManager is available when the module
    // resolves AttentionCapabilities.ViewState to build the editor state store.
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupSettings, AttentionEvents.AttentionReady),
    activate: MarkdownState,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AnchorSort,
  }),
  Plugin.make,
);

export default MarkdownPlugin;
