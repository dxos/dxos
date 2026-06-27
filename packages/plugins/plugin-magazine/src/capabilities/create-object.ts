//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Format, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { AutofillAnnotation, autofill, OptionsLookupAnnotation, optionsLookup } from '@dxos/react-ui-form';

import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

import { getMagazinesPath } from '../paths';
import {
  browserCorsProxy,
  fetchRss,
  listStandardSitePublications,
  searchStandardSiteHandles,
} from '../operations/sources';

// Structural gates (regex / URL format), used as form-field validation and to short-circuit the network
// effects on obviously-malformed input. Handle existence is verified implicitly by the publication lookup
// (an unresolvable handle yields no publications, and a publication is required to submit).
const HandleSchema = Schema.String.pipe(Schema.pattern(/^@?([\da-z-]+\.)+[a-z]{2,}$|^did:[a-z]+:[a-zA-Z0-9._%:-]+$/i));
const isHandle = Schema.is(HandleSchema);
const isUrl = Schema.is(Format.URL);

const StandardSiteCreateBase = Schema.Struct({
  type: Schema.Literal('standard-site'),
  handle: HandleSchema.annotations({ title: 'Handle', description: 'atproto handle, e.g. dxos.org.' }),
  // No `name`: the feed name is taken from the selected publication (resolved by `fetchStandardSite`).
  publication: Schema.String.annotations({ title: 'Publication', description: 'Choose a publication.' }),
});
type StandardSiteValues = Schema.Schema.Type<typeof StandardSiteCreateBase>;

const StandardSiteCreate = Schema.Struct({
  ...StandardSiteCreateBase.fields,
  // Handle is a combobox: typing queries known handles (typeahead); the typed text stays selectable.
  handle: StandardSiteCreateBase.fields.handle.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<StandardSiteValues>()(
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
  publication: StandardSiteCreateBase.fields.publication.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<StandardSiteValues>()(['handle'], ({ handle }) =>
        isHandle(handle)
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

const RssCreateBase = Schema.Struct({
  type: Schema.Literal('rss'),
  url: Format.URL.annotations({ title: 'URL', description: 'RSS feed URL.' }),
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});
type RssValues = Schema.Schema.Type<typeof RssCreateBase>;

const RssCreate = Schema.Struct({
  ...RssCreateBase.fields,
  // Name is pre-filled from the feed title once the `url` is a valid feed URL.
  name: Schema.optional(
    Schema.String.pipe(
      AutofillAnnotation.set(
        autofill<RssValues>()(['url'], ({ url }) =>
          isUrl(url)
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

type CreateSubscriptionInput = Schema.Schema.Type<typeof CreateSubscriptionSchema>;

const makeSubscriptionFromCreate = (input: CreateSubscriptionInput): Subscription.Subscription => {
  switch (input.type) {
    case 'standard-site':
      // `url` stores the publication site reference (at:// or https://); sync derives the author DID
      // from it directly — no handle stored, name resolved from the publication at sync time.
      return Subscription.makeSubscription({ type: 'standard-site', url: input.publication });
    case 'rss':
      return Subscription.makeSubscription({ type: 'rss', url: input.url, name: input.name });
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Subscription.Subscription),
        inputSchema: CreateSubscriptionSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = makeSubscriptionFromCreate(props);
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
