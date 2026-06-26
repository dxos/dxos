//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Format } from '@dxos/echo';

import { Subscription } from '#types';

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

//
// Each member is defined as a base struct (no dynamic annotations) whose value type drives the typed
// `deps`/`values` of the dynamic annotations applied in a second pass below.
//

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
    Annotation.OptionsLookupAnnotation.set(
      Annotation.optionsLookup<StandardSiteValues>()(
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
    Annotation.OptionsLookupAnnotation.set(
      Annotation.optionsLookup<StandardSiteValues>()(['handle'], ({ handle }) =>
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
      Annotation.AutofillAnnotation.set(
        Annotation.autofill<RssValues>()(['url'], ({ url }) =>
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

export const CreateSubscriptionSchema = Schema.Union(StandardSiteCreate, RssCreate);

export type CreateSubscriptionInput = Schema.Schema.Type<typeof CreateSubscriptionSchema>;

/** Normalizes a create-form union member into the stored {@link Subscription.Subscription} fields. */
export const makeSubscriptionFromCreate = (input: CreateSubscriptionInput): Subscription.Subscription => {
  switch (input.type) {
    case 'standard-site':
      // Name is left unset; sync resolves it from the selected publication.
      return Subscription.makeSubscription({ type: 'standard-site', url: input.handle, site: input.publication });
    case 'rss':
      return Subscription.makeSubscription({ type: 'rss', url: input.url, name: input.name });
  }
};
