//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Blogger } from '#types';

export const BloggerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Blogger.Publication, Blogger.Post, Blogger.Draft] }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  // The graph builder queries the personal space for publications, so wait for the client.
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, ClientEvents.ClientReady),
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);

export default BloggerPlugin;
