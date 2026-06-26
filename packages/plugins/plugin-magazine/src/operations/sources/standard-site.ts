//
// Copyright 2026 DXOS.org
//

import { Subscription } from '#types';

import { makeSnippet } from '../../util/text';
import { applyCorsProxy } from './cors';
import { type FeedFetcher, type FetchOptions, type FetchResult } from './feed-fetcher';

// Standard.site (`site.standard.*`) is the AT Protocol lexicon for long-form articles. Reading is
// fully decentralized and auth-free: resolve handle → DID → PDS, then list the actor's public
// `site.standard.document` records. The same records this repo publishes via
// `docs/scripts/sync-to-atproto.ts`. Standard.site lexicons aren't in `@atproto/api`, so the
// response shapes are modelled locally and fetched with plain `fetch` (mirroring the AT Protocol
// endpoints used by `plugin-bluesky`'s `BlueskyApi.resolvePds`).

const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const PLC_DIRECTORY = 'https://plc.directory';
const DOCUMENT_COLLECTION = 'site.standard.document';
const MARKDOWN_CONTENT_TYPE = 'site.standard.content.markdown';

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

/** Fetches a public Standard.site long-form feed (real articles, full markdown body, canonical link). */
export const fetchStandardSite: FeedFetcher = async (url: string, options?: FetchOptions): Promise<FetchResult> => {
  const proxy = options?.corsProxy;
  const actor = parseStandardSiteActor(url);
  const did = await resolveDid(actor, proxy);

  // Per-fetch DID → PDS cache (promises dedupe concurrent lookups); seeded with the actor's own PDS.
  const pdsCache = new Map<string, Promise<string>>();
  const pdsForDid = (target: string): Promise<string> => {
    const cached = pdsCache.get(target);
    if (cached) {
      return cached;
    }
    const resolved = resolvePds(target, proxy);
    pdsCache.set(target, resolved);
    return resolved;
  };

  const pds = await pdsForDid(did);
  const listEndpoint =
    `${pds}/xrpc/com.atproto.repo.listRecords` +
    `?repo=${encodeURIComponent(did)}&collection=${DOCUMENT_COLLECTION}&limit=50`;
  const listed: ListRecordsResponse = await fetchJson(listEndpoint, proxy);
  const records = listed.records ?? [];

  // Author profile (best-effort) supplies feed name/icon and per-post author.
  const profile = await fetchProfile(did, proxy);
  const authorName = profile?.displayName ?? profile?.handle ?? actor;

  // Resolve each distinct publication `site` reference once per fetch (promises dedupe concurrency).
  const publicationCache = new Map<string, Promise<Publication>>();
  const resolvePublication = (site: string): Promise<Publication> => {
    const cached = publicationCache.get(site);
    if (cached) {
      return cached;
    }
    const resolved = resolvePublicationRecord(site, proxy, pdsForDid).catch(() => ({}) as Publication);
    publicationCache.set(site, resolved);
    return resolved;
  };

  const posts = await Promise.all(
    records.map(async (record) => {
      const value = record.value;
      const publication = value.site ? await resolvePublication(value.site) : {};
      // Full markdown body travels in `Post.content` so articles read offline (no second round-trip).
      const content = value.content?.$type === MARKDOWN_CONTENT_TYPE ? value.content.text : undefined;
      const description = value.description ?? (value.textContent ? makeSnippet(value.textContent) : undefined);

      return Subscription.makePost({
        title: value.title,
        link: joinUrl(publication.url, value.path),
        description,
        content,
        author: authorName,
        published: value.publishedAt,
        // The record's AT-URI is the stable dedup key (see `sync-feed.ts` `postKey`).
        guid: record.uri,
      });
    }),
  );

  // Newest first so `sync-feed`'s cursor (posts[0]) advances correctly.
  posts.sort((postA, postB) => (postB.published ?? '').localeCompare(postA.published ?? ''));

  // Feed name prefers the publication title; fall back to the author profile.
  const firstSite = records[0]?.value.site;
  const publicationName = firstSite ? (await resolvePublication(firstSite)).name : undefined;

  const feed = Subscription.makeSubscription({
    name: publicationName ?? authorName,
    url,
    description: profile?.description ?? `Standard.site articles from @${profile?.handle ?? actor}`,
    iconUrl: profile?.avatar,
    type: 'standard-site',
  });

  return { feed, posts };
};

// Minimal type definitions for the XRPC / Standard.site response shapes (public APIs, no auth).

type Publication = {
  /** Canonical site URL (e.g. `https://dxos.org`), trailing slash stripped. */
  url?: string;
  /** Publication display name. */
  name?: string;
};

type DidService = {
  id?: string;
  type?: string;
  serviceEndpoint?: string;
};

type DidDocument = {
  service?: DidService[];
};

type AtprotoProfile = {
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  description?: string;
};

type StandardSiteContent = {
  $type?: string;
  text?: string;
  version?: string;
};

type StandardSiteDocument = {
  site?: string;
  title?: string;
  publishedAt?: string;
  path?: string;
  description?: string;
  content?: StandardSiteContent;
  textContent?: string;
  coverImage?: unknown;
  tags?: string[];
  updatedAt?: string;
};

type ListRecordsResponse = {
  records?: Array<{ uri: string; cid?: string; value: StandardSiteDocument }>;
  cursor?: string;
};

/** Fetches and parses JSON, routing through the optional CORS proxy (browser) like the other sources. */
const fetchJson = async <T>(endpoint: string, proxy?: string): Promise<T> => {
  const response = await fetch(applyCorsProxy(endpoint, proxy));
  if (!response.ok) {
    throw new Error(`Standard.site fetch failed: ${response.status} ${response.statusText} (${endpoint})`);
  }
  return response.json();
};

/** Resolves a handle to a DID (no-op when already a DID) via the public `resolveHandle` XRPC. */
const resolveDid = async (actor: string, proxy?: string): Promise<string> => {
  if (actor.startsWith('did:')) {
    return actor;
  }
  const resolved = await fetchJson<{ did?: string }>(
    `${BSKY_PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
    proxy,
  );
  if (!resolved.did) {
    throw new Error(`Could not resolve handle to DID: ${actor}`);
  }
  return resolved.did;
};

/**
 * Resolves a DID to its PDS endpoint: `did:plc` via the PLC directory DID-doc, `did:web` via the
 * domain's `/.well-known/did.json`. Mirrors `plugin-bluesky`'s `BlueskyApi.resolvePds` endpoints.
 */
const resolvePds = async (did: string, proxy?: string): Promise<string> => {
  let doc: DidDocument;
  if (did.startsWith('did:plc:')) {
    doc = await fetchJson<DidDocument>(`${PLC_DIRECTORY}/${did}`, proxy);
  } else if (did.startsWith('did:web:')) {
    // Per the did:web spec `:` separates host from path segments (each percent-encoded); a bare host
    // resolves to `/.well-known/did.json`, path segments to `/<path>/did.json`.
    const rest = did.slice('did:web:'.length);
    const [host, ...segments] = rest.split(':').map((segment) => decodeURIComponent(segment));
    if (!host) {
      throw new Error(`Invalid did:web identifier: ${did}`);
    }
    const path = segments.length > 0 ? `/${segments.join('/')}/did.json` : '/.well-known/did.json';
    doc = await fetchJson<DidDocument>(`https://${host}${path}`, proxy);
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }
  const service = doc.service?.find(
    (entry) => entry.id === '#atproto_pds' || entry.type === 'AtprotoPersonalDataServer',
  );
  const endpoint = service?.serviceEndpoint;
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error(`No PDS endpoint found for DID: ${did}`);
  }
  return endpoint.replace(/\/$/, '');
};

/** Best-effort author profile lookup (display name / avatar / bio); undefined on any failure. */
const fetchProfile = async (actor: string, proxy?: string): Promise<AtprotoProfile | undefined> => {
  try {
    return await fetchJson<AtprotoProfile>(
      `${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`,
      proxy,
    );
  } catch {
    return undefined;
  }
};

/** Splits an `at://{did}/{collection}/{rkey}` URI into its parts; undefined when malformed. */
const parseAtUri = (uri: string): { did: string; collection: string; rkey: string } | undefined => {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  return match ? { did: match[1], collection: match[2], rkey: match[3] } : undefined;
};

/**
 * Resolves a document's `site` reference to its publication: an `https://` value is the canonical URL
 * directly; an `at://` value is `getRecord`-ed for its `url`/`name`.
 */
const resolvePublicationRecord = async (
  site: string,
  proxy: string | undefined,
  pdsForDid: (did: string) => Promise<string>,
): Promise<Publication> => {
  if (site.startsWith('http')) {
    return { url: site.replace(/\/$/, '') };
  }
  if (site.startsWith('at://')) {
    const parsed = parseAtUri(site);
    if (!parsed) {
      return {};
    }
    const pds = await pdsForDid(parsed.did);
    const endpoint =
      `${pds}/xrpc/com.atproto.repo.getRecord` +
      `?repo=${encodeURIComponent(parsed.did)}&collection=${encodeURIComponent(parsed.collection)}` +
      `&rkey=${encodeURIComponent(parsed.rkey)}`;
    const record = await fetchJson<{ value?: { url?: string; name?: string } }>(endpoint, proxy);
    const value = record.value ?? {};
    return {
      url: typeof value.url === 'string' ? value.url.replace(/\/$/, '') : undefined,
      name: value.name,
    };
  }
  return {};
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
