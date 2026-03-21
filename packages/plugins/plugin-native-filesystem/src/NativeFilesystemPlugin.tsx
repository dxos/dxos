//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceEvents } from '@dxos/plugin-space';

import { AppGraphBuilder, Markdown, OperationResolver, State } from './capabilities';
import { meta } from './meta';
import { NativeFilesystemCapabilities } from './types';
import { translations } from './translations';

const StateReady = AppActivationEvents.createStateEvent(NativeFilesystemCapabilities.State.identifier);

export const NativeFilesystemPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvents.Startup,
    activate: State,
  }),
  Plugin.addModule({
    id: 'operation-resolver',
    activatesOn: ActivationEvent.allOf(ActivationEvents.OperationInvokerReady, StateReady),
    activate: OperationResolver,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, StateReady, SpaceEvents.DefaultSpaceReady),
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: ActivationEvent.allOf(MarkdownEvents.SetupExtensions, StateReady),
    activate: Markdown,
  }),
  Plugin.make,
);
