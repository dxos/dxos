//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as UrlPath from '@dxos/app-toolkit/UrlPath';

import { FORK_PARAM, PATH_PARAM } from './PublicationManifest.ts';

export const archiveUrl = (publicationsUrl: string, publicId: string): URL =>
  new URL(`${encodeURIComponent(publicId)}/archive.json`, withTrailingSlash(publicationsUrl));

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

/** The object path a Composer pathname carries after its workspace, which viewer and fork links append. */
export const objectPathOf = (pathname: string): string | undefined => {
  const [key, , ...rest] = pathname.split('/').filter(Boolean);
  return key === UrlPath.WORKSPACE_KEY && rest.length > 0 ? rest.join('/') : undefined;
};

const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
