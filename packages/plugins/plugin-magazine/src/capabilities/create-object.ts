//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { AutofillAnnotation, OptionsLookupAnnotation, autofill, optionsLookup } from '@dxos/react-ui-form/annotations';

import { CreateSubscription, FeedOperation, Magazine, Subscription } from '#types';

import {
  browserCorsProxy,
  fetchRss,
  listStandardSitePublications,
  searchStandardSiteHandles,
} from '../operations/sources';

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
    ).annotate({ title: 'Name' }),
  ),
});

// RSS first: the form opens on the union's first member, and an RSS URL is the common case — a
// standard-site subscription additionally needs a handle lookup before it can be submitted.
const CreateSubscriptionSchema = Schema.Union([RssCreate, StandardSiteCreate]);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Subscription.Subscription),
          inputSchema: CreateSubscriptionSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = CreateSubscription.makeSubscriptionFromCreate(props);
              const result = yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
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
        },
        {
          id: Type.getTypename(Magazine.Magazine),
          inputSchema: Magazine.CreateMagazineSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const magazine = Magazine.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object: magazine,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
