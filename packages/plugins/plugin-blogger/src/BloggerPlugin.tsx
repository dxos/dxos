//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Blog } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BloggerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Blog.Publication, Blog.Post] }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  // The graph builder queries the personal space for publications (needs the client) and reads the
  // attention ViewState to derive the draft-anchored comments companion (needs attention ready).
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(
      AppActivationEvents.SetupAppGraph,
      ClientEvents.ClientReady,
      AttentionEvents.AttentionReady,
    ),
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);

export default BloggerPlugin;
