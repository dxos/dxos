//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Ref } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { MagazineBlueprint } from '#blueprints';
import { AppGraphBuilder, BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

/** Starter feed seeded into every newly created Magazine. */
const DEFAULT_MAGAZINE_FEED = {
  name: 'EFF Updates',
  url: 'https://www.eff.org/rss/updates.xml',
  type: 'rss',
} as Subscription.Feed;

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Subscription.Feed.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Subscription.CreateFeedSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Subscription.makeFeed(props);
              const result = yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
              // Auto-sync after creation if URL is provided.
              if (object.url) {
                yield* Operation.schedule(FeedOperation.SyncFeed, { feed: object });
              }
              return result;
            })) satisfies CreateObject,
        },
      },
      {
        id: Subscription.Post.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
      {
        id: Magazine.Magazine.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Magazine.Magazine).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Magazine.Magazine).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Magazine.CreateMagazineSchema,
          blueprints: [MagazineBlueprint.key],
          createObject: ((props, options) =>
            Effect.gen(function* () {
              // Seed every new Magazine with one starter Feed so the article view has
              // something to curate immediately rather than booting into an empty state.
              // Best-effort: a seeding failure (AddObject reject, SyncFeed schedule
              // error) must not abort Magazine creation, and partial success (feed
              // added but schedule failed) would otherwise leave an orphaned hidden
              // feed referenced by no magazine. Wrapping the whole block in
              // `Effect.option` collapses both into a clean None on failure.
              const seededFeed = yield* Effect.gen(function* () {
                const defaultFeed = Subscription.makeFeed({ ...DEFAULT_MAGAZINE_FEED });
                yield* Operation.invoke(SpaceOperation.AddObject, {
                  object: defaultFeed,
                  target: options.target,
                  hidden: true,
                  targetNodeId: options.targetNodeId,
                });
                yield* Operation.schedule(FeedOperation.SyncFeed, { feed: defaultFeed });
                return defaultFeed;
              }).pipe(Effect.option);

              const initialFeeds = Option.isSome(seededFeed) ? [Ref.make(seededFeed.value)] : [];
              const object = Magazine.make({ ...props, feeds: initialFeeds });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Subscription.Feed, Subscription.Post, Magazine.Magazine],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
