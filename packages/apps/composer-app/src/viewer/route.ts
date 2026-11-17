//
// Copyright 2026 DXOS.org
//

import * as PublicationLink from '@dxos/plugin-space/PublicationLink';
import * as PublicationManifest from '@dxos/plugin-space/PublicationManifest';

export type ViewerRoute = {
  publicId: string;
  objectPath?: string;
};

export const parseRoute = (location: Pick<Location, 'pathname' | 'search'>): ViewerRoute | undefined => {
  const kept = new URLSearchParams(location.search).get(PublicationManifest.VIEWER_PARAM);
  if (kept) {
    return { publicId: kept, objectPath: PublicationLink.objectPathOf(location.pathname) };
  }
  const [publicId, ...rest] = location.pathname.split('/').filter(Boolean);
  return publicId ? { publicId, objectPath: rest.length > 0 ? rest.join('/') : undefined } : undefined;
};

export const replaceWithSpace = (spaceId: string, { publicId, objectPath }: ViewerRoute): void => {
  const url = new URL(window.location.href);
  url.pathname = ['', 'w', spaceId, objectPath ?? 'home'].join('/');
  url.searchParams.set(PublicationManifest.VIEWER_PARAM, publicId);
  history.replaceState(null, '', url.pathname + url.search);
};

export const composerOriginOf = (viewerOrigin: string): string => {
  const url = new URL(viewerOrigin);
  url.hostname = url.hostname.replace(/^view\./, '');
  return url.origin;
};

export const currentObjectPath = (): string | undefined => PublicationLink.objectPathOf(window.location.pathname);
