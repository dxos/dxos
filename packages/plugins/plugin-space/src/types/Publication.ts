//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, type Entity } from '@dxos/echo';

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

export const PreviewObject = Schema.Struct({
  title: Schema.String,
  /** The type's singular name (`Document`). */
  type: Schema.String,
  icon: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
});
export interface PreviewObject extends Schema.Schema.Type<typeof PreviewObject> {}

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

export const Receipt = Schema.Struct({
  publicId: Schema.String,
  publishedAt: Schema.String,
});
export interface Receipt extends Schema.Schema.Type<typeof Receipt> {}

export const ReceiptAnnotation = Annotation.make({
  id: 'org.dxos.space.publication',
  schema: Schema.NullOr(Receipt),
});

export const FORK_PARAM = 'fork';

/** Query param carrying the object path (`db/<typeSlug>+<objectId>`) to open after a fork. */
export const PATH_PARAM = 'path';

export const VIEWER_PARAM = 'p';

export const PUBLICATIONS_PATH = '/publications';

export const EDGE_PUBLICATIONS_PATH = '/db/publications';

export const archiveUrl = (publicationsUrl: string, publicId: string): URL =>
  new URL(`${encodeURIComponent(publicId)}/archive.json`, withTrailingSlash(publicationsUrl));

export const manifestUrl = (publicationsUrl: string, publicId: string): URL =>
  new URL(`${encodeURIComponent(publicId)}/manifest.json`, withTrailingSlash(publicationsUrl));

export const viewerUrl = (viewerOrigin: string, publicId: string, path?: string): URL =>
  new URL(['', publicId, ...(path ? [path] : [])].join('/'), viewerOrigin);

export const forkUrl = (composerOrigin: string, publicId: string, path?: string): URL => {
  const url = new URL('/', composerOrigin);
  url.searchParams.set(FORK_PARAM, publicId);
  if (path) {
    url.searchParams.set(PATH_PARAM, path);
  }
  return url;
};

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

const WORKSPACE_KEY = 'w';

const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
