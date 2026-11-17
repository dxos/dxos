//
// Copyright 2026 DXOS.org
//

import * as Publication from '@dxos/plugin-space/Publication';

export type ViewerRoute = {
  publicId: string;
  /** The object path after the workspace (`db/<typeSlug>+<objectId>`), if the link names one. */
  objectPath?: string;
};

/**
 * Reads the publication a viewer URL names. The shared link carries the public id in the workspace
 * segment; once the bake is imported that segment holds the local space id, and the public id moves to
 * `?p=` so a reload still finds it.
 */
export const parseRoute = (location: Pick<Location, 'pathname' | 'search'>): ViewerRoute | undefined => {
  const kept = new URLSearchParams(location.search).get(Publication.VIEWER_PARAM);
  if (kept) {
    return { publicId: kept, objectPath: Publication.objectPathOf(location.pathname) };
  }
  const [publicId, ...rest] = location.pathname.split('/').filter(Boolean);
  return publicId ? { publicId, objectPath: rest.length > 0 ? rest.join('/') : undefined } : undefined;
};

/** Points the address bar at the imported space, keeping the public id for reloads. */
export const replaceWithSpace = (spaceId: string, { publicId, objectPath }: ViewerRoute): void => {
  const url = new URL(window.location.href);
  url.pathname = ['', 'w', spaceId, objectPath ?? 'home'].join('/');
  url.searchParams.set(Publication.VIEWER_PARAM, publicId);
  history.replaceState(null, '', url.pathname + url.search);
};

/** The Composer app this viewer belongs to: its own host without the `view.` label. */
export const composerOriginOf = (viewerOrigin: string): string => {
  const url = new URL(viewerOrigin);
  url.hostname = url.hostname.replace(/^view\./, '');
  return url.origin;
};

/** The current object path, read from the address bar as the deck keeps it. */
export const currentObjectPath = (): string | undefined => Publication.objectPathOf(window.location.pathname);
