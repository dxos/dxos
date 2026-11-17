//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Annotation, type Entity, Key } from '@dxos/echo';

import { FORK_PARAM, PATH_PARAM } from './PublicationManifest.ts';

export * from './PublicationManifest.ts';

export const Receipt = Schema.Struct({
  publicId: Schema.String,
  publishedAt: Schema.String,
});
export interface Receipt extends Schema.Schema.Type<typeof Receipt> {}

export const ReceiptAnnotation = Annotation.make({
  id: 'org.dxos.space.publication',
  schema: Schema.NullOr(Receipt),
});

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

/**
 * The object an object path opens: the last segment whose tail is an entity id, whichever key or route leads to it
 * (`db/<typeSlug>+<objectId>`, or a collection's path).
 */
export const objectIdOfPath = (path: string): string | undefined =>
  path
    .split('/')
    .map((segment) => segment.split(UrlPath.TAIL_SEPARATOR).at(-1) ?? '')
    .findLast(Key.EntityId.isValid);

export const objectPathOf = (pathname: string): string | undefined => {
  const [key, , ...rest] = pathname.split('/').filter(Boolean);
  return key === UrlPath.WORKSPACE_KEY && rest.length > 0 ? rest.join('/') : undefined;
};

const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
