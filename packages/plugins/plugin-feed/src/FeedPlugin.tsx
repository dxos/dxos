//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Subscription } from './types';

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Subscription.Feed.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
      {
        id: Subscription.Post.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addSchemaModule({
    schema: [Subscription.Feed, Subscription.Post],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
