//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { AutofillAnnotation, OptionsLookupAnnotation, autofill, optionsLookup } from '@dxos/react-ui-form';

import { CreateSubscription, FeedOperation, Magazine, Subscription } from '#types';

import {
  browserCorsProxy,
  fetchRss,
  listStandardSitePublications,
  searchStandardSiteHandles,
} from '../operations/sources';
import { getMagazinesPath } from '../paths';

const StandardSiteCreate = Schema.Struct({
  ...CreateSubscription.StandardSiteCreateBase.fields,
  // Handle is a combobox: typing queries known handles (typeahead); the typed text stays selectable.
  handle: CreateSubscription.StandardSiteCreateBase.fields.handle.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<CreateSubscription.StandardSiteValues>()(
        ['handle'],
        ({ handle }) =>
          searchStandardSiteHandles(handle ?? '', { corsProxy: browserCorsProxy() }).pipe(
            Effect.map((suggestions) =>
              suggestions.map((suggestion) => ({
                value: suggestion.handle,
                label: suggestion.handle,
                secondaryLabel: suggestion.displayName,
              })),
            ),
          ),
        { combobox: true },
      ),
    ),
  ),
  // Publication options are looked up from the entered `handle`.
  publication: CreateSubscription.StandardSiteCreateBase.fields.publication.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<CreateSubscription.StandardSiteValues>()(['handle'], ({ handle }) =>
        CreateSubscription.isHandle(handle)
          ? listStandardSitePublications(handle, { corsProxy: browserCorsProxy() }).pipe(
              Effect.map((publications) =>
                publications.map((publication) => ({
                  value: publication.site,
                  label: publication.name ?? publication.url ?? publication.site,
                })),
              ),
              Effect.orElseSucceed(() => []),
            )
          : Effect.succeed([]),
      ),
    ),
  ),
});

const RssCreate = Schema.Struct({
  ...CreateSubscription.RssCreateBase.fields,
  // Name is pre-filled from the feed title once the `url` is a valid feed URL.
  name: Schema.optional(
    Schema.String.pipe(
      AutofillAnnotation.set(
        autofill<CreateSubscription.RssValues>()(['url'], ({ url }) =>
          CreateSubscription.isUrl(url)
            ? fetchRss(url, { corsProxy: browserCorsProxy() }).pipe(
                Effect.map((result) => result.feed.name),
                Effect.orElseSucceed(() => undefined),
              )
            : Effect.succeed(undefined),
        ),
      ),
    ).annotations({ title: 'Name' }),
  ),
});

const CreateSubscriptionSchema = Schema.Union(StandardSiteCreate, RssCreate);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Subscription.Subscription),
        inputSchema: CreateSubscriptionSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = CreateSubscription.makeSubscriptionFromCreate(props);
            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
            // Auto-sync after creation if URL is provided.
            if (object.url) {
              yield* Operation.schedule(
                FeedOperation.SyncFeed,
                { feed: Ref.make(object) },
                { spaceId: Obj.getDatabase(object)?.spaceId },
              );
            }
            return result;
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Magazine.Magazine),
        inputSchema: Magazine.CreateMagazineSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const magazine = Magazine.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object: magazine,
              target: options.target,
              targetNodeId: getMagazinesPath(options.db.spaceId),
            });
          }),
      }),
    ];
  }),
);
