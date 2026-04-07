//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import { meta } from '#meta';
import { NativeFilesystemCapabilities } from '#types';
import { translations } from './translations';

import { AppGraphBuilder, Markdown, OperationHandler, ReactSurface, State } from '#capabilities';

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
    activatesAfter: [StateReady],
    activate: State,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: ActivationEvent.allOf(MarkdownEvents.SetupExtensions, StateReady),
    activate: Markdown,
  }),
  Plugin.make,
);
