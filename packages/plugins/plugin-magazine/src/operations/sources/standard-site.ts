//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Subscription } from '#types';

import { makeSnippet } from '../../util/text';
import { FeedFetchError, type FeedFetcher, type FetchOptions } from './feed-fetcher';
import { getJson } from './http';

// Standard.site (`site.standard.*`) is the AT Protocol lexicon for long-form articles. Reading is
// fully decentralized and auth-free: resolve handle → DID → PDS, then list the actor's public
// `site.standard.document` records. The same records this repo publishes via
// `docs/scripts/sync-to-atproto.ts`. Standard.site lexicons aren't in `@atproto/api`, so the
// response shapes are modelled locally and fetched with the platform `HttpClient` (mirroring the AT
// Protocol endpoints used by `plugin-bluesky`'s `BlueskyApi.resolvePds`).

const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const PLC_DIRECTORY = 'https://plc.directory';
const DOCUMENT_COLLECTION = 'site.standard.document';
const MARKDOWN_CONTENT_TYPE = 'site.standard.content.markdown';

/** A publication a handle publishes under, keyed by its Standard.site `site` reference. */
export type Publication = {
  /** The document `site` reference (`at://…` URI or `https://…` URL); the stable selection key. */
  site: string;
  /** Canonical site URL (e.g. `https://dxos.org`), trailing slash stripped. */
  url?: string;
  /** Publication display name. */
  name?: string;
};

/**
 * Extracts an atproto handle or DID from a URL or raw identifier.
 * Supports: bare handles (`dxos.org`), `@handle`, `did:plc:…`/`did:web:…`, or a
 * `https://bsky.app/profile/{actor}` URL.
 */
export const parseStandardSiteActor = (url: string): string => {
  const match = url.match(/bsky\.app\/profile\/([^/?#]+)/);
  if (match) {
    return match[1];
  }
  // Already a DID or bare handle.
  return url.replace(/^@/, '').trim();
};

/** Lists the publications a handle publishes under (deduped by `site`), for publication selection. */
export const listStandardSitePublications = (
  actorOrUrl: string,
  options?: FetchOptions,
): Effect.Effect<Publication[], FeedFetchError> =>
  Effect.gen(function* () {
    const proxy = options?.corsProxy;
    const actor = parseStandardSiteActor(actorOrUrl);
    const did = yield* resolveDid(actor, proxy);
    const pds = yield* resolvePds(did, proxy);
    const records = yield* listDocuments(pds, did, proxy);
    const sites = distinct(records.map((record) => record.value.site).filter(isString));
    return yield* resolvePublications(sites, did, pds, proxy);
  }).pipe(Effect.provide(FetchHttpClient.layer));

/** A handle suggestion returned by typeahead search. */
export type HandleSuggestion = { handle: string; displayName?: string };

/** Searches atproto handles by prefix (typeahead), for combobox suggestions; empty on blank/failed query. */
export const searchStandardSiteHandles = (
  query: string,
  options?: FetchOptions,
): Effect.Effect<HandleSuggestion[], never> =>
  query.trim().length === 0
    ? Effect.succeed([])
    : getJson(
        SearchActorsResponse,
        `${BSKY_PUBLIC_API}/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(query.trim())}&limit=8`,
        options?.corsProxy,
      ).pipe(
        Effect.map((response) =>
          (response.actors ?? []).map((actor) => ({ handle: actor.handle, displayName: actor.displayName })),
        ),
        Effect.orElseSucceed((): HandleSuggestion[] => []),
        Effect.provide(FetchHttpClient.layer),
      );

/** Fetches a public Standard.site long-form feed (real articles, full markdown body, canonical link). */
export const fetchStandardSite: FeedFetcher = (url, options) =>
  Effect.gen(function* () {
    const proxy = options?.corsProxy;
    const selectedSite = options?.publication;
    const actor = parseStandardSiteActor(url);
    const did = yield* resolveDid(actor, proxy);
    const pds = yield* resolvePds(did, proxy);

    const allRecords = yield* listDocuments(pds, did, proxy);
    // Scope the feed to the selected publication (single-required at create time); absent ⇒ all records.
    const records = selectedSite ? allRecords.filter((record) => record.value.site === selectedSite) : allRecords;

    // Author profile (best-effort) supplies feed name/icon and per-post author.
    const profile = yield* fetchProfile(did, proxy);
    const authorName = profile?.displayName ?? profile?.handle ?? actor;

    // Resolve each distinct publication `site` reference once per fetch.
    const sites = distinct(records.map((record) => record.value.site).filter(isString));
    const publications = new Map((yield* resolvePublications(sites, did, pds, proxy)).map((pub) => [pub.site, pub]));

    const posts = records.map((record) => {
      const value = record.value;
      const publication = value.site ? publications.get(value.site) : undefined;
      // Full markdown body travels in `Post.content` so articles read offline (no second round-trip).
      const content = value.content?.$type === MARKDOWN_CONTENT_TYPE ? value.content.text : undefined;
      const description = value.description ?? (value.textContent ? makeSnippet(value.textContent) : undefined);

      return Subscription.makePost({
        title: value.title,
        link: joinUrl(publication?.url, value.path),
        description,
        content,
        author: authorName,
        published: value.publishedAt,
        // The record's AT-URI is the stable dedup key (see `sync-feed.ts` `postKey`).
        guid: record.uri,
      });
    });

    // Newest first so `sync-feed`'s cursor (posts[0]) advances correctly.
    posts.sort((postA, postB) => (postB.published ?? '').localeCompare(postA.published ?? ''));

    // Feed name prefers the (selected) publication title; fall back to the author profile.
    const namedSite = selectedSite ?? records[0]?.value.site;
    const publicationName = namedSite ? publications.get(namedSite)?.name : undefined;

    const feed = Subscription.makeSubscription({
      name: publicationName ?? authorName,
      url,
      description: profile?.description ?? `Standard.site articles from @${profile?.handle ?? actor}`,
      iconUrl: profile?.avatar,
      type: 'standard-site',
    });

    return { feed, posts };
  }).pipe(Effect.provide(FetchHttpClient.layer));

//
// Response schemas for the XRPC / Standard.site shapes (public APIs, no auth). Excess fields are ignored.
//

const ResolveHandleResponse = Schema.Struct({ did: Schema.optional(Schema.String) });

const SearchActorsResponse = Schema.Struct({
  actors: Schema.optional(
    Schema.Array(Schema.Struct({ handle: Schema.String, displayName: Schema.optional(Schema.String) })),
  ),
});

const DidDocument = Schema.Struct({
  service: Schema.optional(
    Schema.Array(
      Schema.Struct({
        id: Schema.optional(Schema.String),
        type: Schema.optional(Schema.String),
        serviceEndpoint: Schema.optional(Schema.String),
      }),
    ),
  ),
});

const Profile = Schema.Struct({
  handle: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  avatar: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
});
type Profile = Schema.Schema.Type<typeof Profile>;

const StandardSiteDocument = Schema.Struct({
  site: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  publishedAt: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  content: Schema.optional(
    Schema.Struct({
      $type: Schema.optional(Schema.String),
      text: Schema.optional(Schema.String),
    }),
  ),
  textContent: Schema.optional(Schema.String),
});

const ListRecordsResponse = Schema.Struct({
  records: Schema.optional(Schema.Array(Schema.Struct({ uri: Schema.String, value: StandardSiteDocument }))),
  cursor: Schema.optional(Schema.String),
});
type DocumentRecord = NonNullable<Schema.Schema.Type<typeof ListRecordsResponse>['records']>[number];

const PublicationRecord = Schema.Struct({
  value: Schema.optional(Schema.Struct({ url: Schema.optional(Schema.String), name: Schema.optional(Schema.String) })),
});

//
// Resolution chain (each step requires an `HttpClient`, provided by the public entrypoints above).
//

/** Resolves a handle to a DID (no-op when already a DID) via the public `resolveHandle` XRPC. */
const resolveDid = (actor: string, proxy?: string): Effect.Effect<string, FeedFetchError, HttpClient.HttpClient> =>
  actor.startsWith('did:')
    ? Effect.succeed(actor)
    : getJson(
        ResolveHandleResponse,
        `${BSKY_PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
        proxy,
      ).pipe(
        Effect.flatMap((resolved) =>
          resolved.did
            ? Effect.succeed(resolved.did)
            : Effect.fail(new FeedFetchError({ message: `Could not resolve handle to DID: ${actor}` })),
        ),
      );

/**
 * Resolves a DID to its PDS endpoint: `did:plc` via the PLC directory DID-doc, `did:web` via the
 * domain's `/.well-known/did.json`. Mirrors `plugin-bluesky`'s `BlueskyApi.resolvePds` endpoints.
 */
const resolvePds = (did: string, proxy?: string): Effect.Effect<string, FeedFetchError, HttpClient.HttpClient> => {
  if (did.startsWith('did:plc:')) {
    return getJson(DidDocument, `${PLC_DIRECTORY}/${did}`, proxy).pipe(Effect.flatMap((doc) => extractPds(doc, did)));
  }
  if (did.startsWith('did:web:')) {
    // Per the did:web spec `:` separates host from path segments (each percent-encoded); a bare host
    // resolves to `/.well-known/did.json`, path segments to `/<path>/did.json`.
    const [host, ...segments] = did
      .slice('did:web:'.length)
      .split(':')
      .map((segment) => decodeURIComponent(segment));
    if (!host) {
      return Effect.fail(new FeedFetchError({ message: `Invalid did:web identifier: ${did}` }));
    }
    const path = segments.length > 0 ? `/${segments.join('/')}/did.json` : '/.well-known/did.json';
    return getJson(DidDocument, `https://${host}${path}`, proxy).pipe(Effect.flatMap((doc) => extractPds(doc, did)));
  }
  return Effect.fail(new FeedFetchError({ message: `Unsupported DID method: ${did}` }));
};

const extractPds = (
  doc: Schema.Schema.Type<typeof DidDocument>,
  did: string,
): Effect.Effect<string, FeedFetchError> => {
  const service = doc.service?.find(
    (entry) => entry.id === '#atproto_pds' || entry.type === 'AtprotoPersonalDataServer',
  );
  const endpoint = service?.serviceEndpoint;
  return typeof endpoint === 'string' && endpoint.length > 0
    ? Effect.succeed(endpoint.replace(/\/$/, ''))
    : Effect.fail(new FeedFetchError({ message: `No PDS endpoint found for DID: ${did}` }));
};

/** Lists the actor's `site.standard.document` records (newest window). */
const listDocuments = (
  pds: string,
  did: string,
  proxy?: string,
): Effect.Effect<readonly DocumentRecord[], FeedFetchError, HttpClient.HttpClient> =>
  getJson(
    ListRecordsResponse,
    `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${DOCUMENT_COLLECTION}&limit=50`,
    proxy,
  ).pipe(Effect.map((listed) => listed.records ?? []));

/** Best-effort author profile lookup (display name / avatar / bio); undefined on any failure. */
const fetchProfile = (
  actor: string,
  proxy?: string,
): Effect.Effect<Profile | undefined, never, HttpClient.HttpClient> =>
  getJson(Profile, `${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`, proxy).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
  );

/** Resolves each `site` reference to a {@link Publication}; a failed resolution degrades to bare `{ site }`. */
const resolvePublications = (
  sites: readonly string[],
  actorDid: string,
  actorPds: string,
  proxy?: string,
): Effect.Effect<Publication[], FeedFetchError, HttpClient.HttpClient> =>
  Effect.forEach(
    sites,
    (site) => resolvePublication(site, actorDid, actorPds, proxy).pipe(Effect.catchAll(() => Effect.succeed({ site }))),
    { concurrency: 'unbounded' },
  );

/**
 * Resolves a document's `site` reference to its publication: an `https://` value is the canonical URL
 * directly; an `at://` value is `getRecord`-ed for its `url`/`name` (reusing the actor's PDS when the
 * record lives in the actor's own repo).
 */
const resolvePublication = (
  site: string,
  actorDid: string,
  actorPds: string,
  proxy?: string,
): Effect.Effect<Publication, FeedFetchError, HttpClient.HttpClient> => {
  if (site.startsWith('http')) {
    return Effect.succeed({ site, url: site.replace(/\/$/, '') });
  }
  if (site.startsWith('at://')) {
    const parsed = parseAtUri(site);
    if (!parsed) {
      return Effect.succeed({ site });
    }
    return Effect.gen(function* () {
      const pds = parsed.did === actorDid ? actorPds : yield* resolvePds(parsed.did, proxy);
      const record = yield* getJson(
        PublicationRecord,
        `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(parsed.did)}` +
          `&collection=${encodeURIComponent(parsed.collection)}&rkey=${encodeURIComponent(parsed.rkey)}`,
        proxy,
      );
      const value = record.value ?? {};
      return { site, url: value.url ? value.url.replace(/\/$/, '') : undefined, name: value.name };
    });
  }
  return Effect.succeed({ site });
};

//
// Pure helpers.
//

/** Splits an `at://{did}/{collection}/{rkey}` URI into its parts; undefined when malformed. */
const parseAtUri = (uri: string): { did: string; collection: string; rkey: string } | undefined => {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  return match ? { did: match[1], collection: match[2], rkey: match[3] } : undefined;
};

/** Joins a publication base URL with a document path into a canonical link. */
const joinUrl = (base: string | undefined, path: string | undefined): string | undefined => {
  if (!base) {
    return undefined;
  }
  if (!path) {
    return base;
  }
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const isString = (value: string | undefined): value is string => typeof value === 'string';

const distinct = (values: readonly string[]): string[] => [...new Set(values)];
