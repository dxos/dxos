//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import { AppGraphBuilder, Markdown, OperationHandler, ReactSurface, State } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { NativeFilesystemCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const StateReady = AppActivationEvents.createStateEvent(NativeFilesystemCapabilities.State.identifier);

export const NativeFilesystemPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, StateReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSurfaceModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.SetupReactSurface, StateReady),
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ClientEvents.ClientReady,
    firesAfterActivation: [StateReady],
    activate: State,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: ActivationEvent.allOf(MarkdownEvents.SetupExtensions, StateReady),
    activate: Markdown,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default NativeFilesystemPlugin;
