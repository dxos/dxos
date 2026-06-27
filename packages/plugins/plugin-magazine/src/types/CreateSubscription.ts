//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

import * as Subscription from './Subscription';

// Structural gates (regex / URL format), used as form-field validation and to short-circuit the network
// effects on obviously-malformed input. Handle existence is verified implicitly by the publication lookup
// (an unresolvable handle yields no publications, and a publication is required to submit).
export const HandleSchema = Schema.String.pipe(
  Schema.pattern(/^@?([\da-z-]+\.)+[a-z]{2,}$|^did:[a-z]+:[a-zA-Z0-9._%:-]+$/i),
);

export const isHandle = Schema.is(HandleSchema);
export const isUrl = Schema.is(Format.URL);

//
// Base structs (no dynamic annotations). The capability layer (create-object.ts) applies annotation
// closures on top — those closures reference operations/sources and so cannot live in this module.
//

export const StandardSiteCreateBase = Schema.Struct({
  type: Schema.Literal('standard-site'),
  handle: HandleSchema.annotations({ title: 'Handle', description: 'atproto handle, e.g. dxos.org.' }),
  // No `name`: the feed name is taken from the selected publication (resolved by `fetchStandardSite`).
  publication: Schema.String.annotations({ title: 'Publication', description: 'Choose a publication.' }),
});

export type StandardSiteValues = Schema.Schema.Type<typeof StandardSiteCreateBase>;

export const RssCreateBase = Schema.Struct({
  type: Schema.Literal('rss'),
  url: Format.URL.annotations({ title: 'URL', description: 'RSS feed URL.' }),
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

export type RssValues = Schema.Schema.Type<typeof RssCreateBase>;

// Input type covers both annotated union members; the union itself is built in create-object.ts after
// annotations are applied. The switch narrows on `type` which is common to both shapes.
export type CreateSubscriptionInput =
  | { type: 'standard-site'; handle: string; publication: string }
  | { type: 'rss'; url: string; name?: string };

/** Normalizes a create-form union member into the stored {@link Subscription.Subscription} fields. */
export const makeSubscriptionFromCreate = (input: CreateSubscriptionInput): Subscription.Subscription => {
  switch (input.type) {
    case 'standard-site':
      // `url` stores the publication site reference (at:// or https://); sync derives the author DID
      // from it directly — no handle stored, name resolved from the publication at sync time.
      return Subscription.makeSubscription({ type: 'standard-site', url: input.publication });
    case 'rss':
      return Subscription.makeSubscription({ type: 'rss', url: input.url, name: input.name });
  }
};
