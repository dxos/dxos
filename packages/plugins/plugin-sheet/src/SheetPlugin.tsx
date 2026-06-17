//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import {
  AnchorSort,
  AppGraphBuilder,
  BranchDiffSupport,
  NavigationResolver,
  CommentConfig,
  ComputeGraphRegistry,
  CreateObject,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactSurface,
  SheetState,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sheet } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addCommentConfigModule({ activate: CommentConfig }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: SheetState,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, ActivationEvents.ProcessManagerReady),
    activate: ComputeGraphRegistry,
  }),
  Plugin.addModule({
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AnchorSort,
  }),
  Plugin.addModule({ activatesOn: AppActivationEvents.SetupAppGraph, activate: BranchDiffSupport }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SheetPlugin;
