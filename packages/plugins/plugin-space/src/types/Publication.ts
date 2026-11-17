//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, type Entity } from '@dxos/echo';

/** A type's share of a publication, for the link-preview image's stats and type bar. */
export const PreviewType = Schema.Struct({
  typename: Schema.String,
  /** The type's name for `count` objects, as Composer shows it (`3 Documents`). */
  label: Schema.String,
  /** Phosphor icon id (`ph--file-text--regular`). */
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),
  count: Schema.Number,
});
export interface PreviewType extends Schema.Schema.Type<typeof PreviewType> {}

/** What the link-preview image of one object link draws. */
export const PreviewObject = Schema.Struct({
  title: Schema.String,
  /** The type's singular name (`Document`). */
  type: Schema.String,
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
});
export interface PreviewObject extends Schema.Schema.Type<typeof PreviewObject> {}

/** What link previews draw, taken from the archive's own content at publish time. */
export const Preview = Schema.Struct({
  description: Schema.optional(Schema.String),
  /** Phosphor icon id of the space. */
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),
  /** Most numerous first. */
  types: Schema.Array(PreviewType),
  /** Titled objects, by object id. */
  objects: Schema.Record(Schema.String, PreviewObject),
});
export interface Preview extends Schema.Schema.Type<typeof Preview> {}

/**
 * What a publication carries beside its JSON space archive. The viewer reads `objects` to tell a
 * baked object from one added after the bake.
 */
export const Manifest = Schema.Struct({
  version: Schema.Literal(1),
  name: Schema.optional(Schema.String),
  publishedAt: Schema.String,
  /** NSIDs the space enables (`space.properties.plugins`); recorded, never enabled automatically. */
  plugins: Schema.Array(Schema.String),
  /** Ids of every object in the bake. */
  objects: Schema.Array(Schema.String),
  preview: Schema.optional(Preview),
});
export interface Manifest extends Schema.Schema.Type<typeof Manifest> {}

/** EDGE's answer to a publish or republish. */
export const Receipt = Schema.Struct({
  publicId: Schema.String,
  publishedAt: Schema.String,
});
export interface Receipt extends Schema.Schema.Type<typeof Receipt> {}

/**
 * The receipt, kept on the space's properties so a republish replaces the same public id; `null` once
 * unpublished, since an annotation cannot be removed.
 */
export const ReceiptAnnotation = Annotation.make({
  id: 'org.dxos.space.publication',
  schema: Schema.NullOr(Receipt),
});

/** Query param that asks Composer to fork a publication into a new space. */
export const FORK_PARAM = 'fork';

/** Query param carrying the object path (`db/<typeSlug>+<objectId>`) to open after a fork. */
export const PATH_PARAM = 'path';

/** Query param the viewer keeps the public id in once the workspace segment holds the local space id. */
export const VIEWER_PARAM = 'p';

/** Public reads of a publication, on the viewer origin. */
export const PUBLICATIONS_PATH = '/publications';

/** EDGE's publication endpoints, which db-service serves: authed writes, and the public reads the viewer proxies. */
export const EDGE_PUBLICATIONS_PATH = '/db/publications';

export const archiveUrl = (publicationsUrl: string, publicId: string): URL =>
  new URL(`${encodeURIComponent(publicId)}/archive.json`, withTrailingSlash(publicationsUrl));

export const manifestUrl = (publicationsUrl: string, publicId: string): URL =>
  new URL(`${encodeURIComponent(publicId)}/manifest.json`, withTrailingSlash(publicationsUrl));

/** The viewer link for a publication, or for one object in it when `path` names it. */
export const viewerUrl = (viewerOrigin: string, publicId: string, path?: string): URL =>
  new URL(['', publicId, ...(path ? [path] : [])].join('/'), viewerOrigin);

/** The Composer link that forks a publication, opening `path` once the fork lands. */
export const forkUrl = (composerOrigin: string, publicId: string, path?: string): URL => {
  const url = new URL('/', composerOrigin);
  url.searchParams.set(FORK_PARAM, publicId);
  if (path) {
    url.searchParams.set(PATH_PARAM, path);
  }
  return url;
};

/** Reads the receipt off space properties, or `undefined` when the space is not published. */
export const getReceipt = (properties: Entity.Unknown | Entity.Snapshot): Receipt | undefined =>
  Option.getOrUndefined(Annotation.get(properties, ReceiptAnnotation)) ?? undefined;

/** Splits a URL object path (`db/<typeSlug>+<objectId>`), or `undefined` for any other shape. */
export const parseObjectPath = (path: string): { typeSlug: string; objectId: string } | undefined => {
  const match = /^db\/([^/+]+)\+([^/]+)$/.exec(path);
  return match ? { typeSlug: match[1], objectId: match[2] } : undefined;
};

/** The object path of a Composer pathname (`/w/<spaceId>/<objectPath>`), or `undefined` for none. */
export const objectPathOf = (pathname: string): string | undefined => {
  const [key, , ...rest] = pathname.split('/').filter(Boolean);
  return key === WORKSPACE_KEY && rest.length > 0 ? rest.join('/') : undefined;
};

/** Composer's URL workspace key (`UrlPath.WORKSPACE_KEY`). */
const WORKSPACE_KEY = 'w';

const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
