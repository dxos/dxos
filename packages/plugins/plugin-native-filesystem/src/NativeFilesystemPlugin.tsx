//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import { AppGraphBuilder, Markdown, OperationHandler, State } from './capabilities';
import { meta } from './meta';
import { NativeFilesystemCapabilities } from './types';
import { translations } from './translations';

const StateReady = AppActivationEvents.createStateEvent(NativeFilesystemCapabilities.State.identifier);

export const NativeFilesystemPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, StateReady),
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvents.Startup,
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
