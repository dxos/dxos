//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention';
import { type CreateObject } from '@dxos/plugin-space/types';

import { YouTubeBlueprint } from './blueprints';
import { AppGraphBuilder, BlueprintDefinition, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Channel, Video } from './types';
import { CreateYouTubeChannelSchema } from './types/Channel';

export const YouTubePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Channel.YouTubeChannel.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Channel.YouTubeChannel).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Channel.YouTubeChannel).pipe(Option.getOrThrow).hue ?? 'white',
          blueprints: [YouTubeBlueprint.key],
          inputSchema: CreateYouTubeChannelSchema,
          createObject: ((props) => Effect.sync(() => Channel.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Video.YouTubeVideo.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Video.YouTubeVideo).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Video.YouTubeVideo).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addSchemaModule({
    schema: [Channel.YouTubeChannel, Video.YouTubeVideo],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
