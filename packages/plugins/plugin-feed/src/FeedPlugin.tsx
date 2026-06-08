//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { AttentionEvents } from '@dxos/plugin-attention';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CreateObject,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { FeedOperation, Magazine, Subscription } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Subscription.Subscription, Subscription.Post, Subscription.PostContent, Magazine.Magazine],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(FeedOperation.OnCreateSpace, params),
        ),
      ),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default FeedPlugin;
