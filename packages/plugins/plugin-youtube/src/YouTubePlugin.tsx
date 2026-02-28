//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type CreateObject } from '@dxos/plugin-space/types';

import { YouTubeBlueprint } from './blueprints';
import { AppGraphBuilder, BlueprintDefinition, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Channel, Video } from './types';
import { CreateYouTubeChannelSchema } from './types/Channel';

export const YouTubePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Channel.YouTubeChannel.typename,
        metadata: {
          icon: 'ph--youtube-logo--regular',
          iconHue: 'red',
          blueprints: [YouTubeBlueprint.key],
          inputSchema: CreateYouTubeChannelSchema,
          createObject: ((props, { db }) =>
            Effect.gen(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Channel.make({ ...props, space });
            })) satisfies CreateObject,
        },
      },
      {
        id: Video.YouTubeVideo.typename,
        metadata: {
          icon: 'ph--play--regular',
          iconHue: 'red',
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
