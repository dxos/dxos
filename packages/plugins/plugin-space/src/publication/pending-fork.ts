//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { Publication } from '#types';

/**
 * A fork waits here while the visitor signs in. Local storage rather than session storage, since a
 * magic-link sign-in lands in a new tab.
 */
const STORAGE_KEY = 'org.dxos.plugin.space.pending-fork';

/** A fork older than this is stale: the visitor wandered off and came back for something else. */
const MAX_AGE_MS = 60 * 60 * 1_000;

export type PendingFork = { publicId: string; path?: string; at: number };

/** Moves a `?fork=` intent out of the URL into storage, so a sign-in round trip cannot drop it. */
export const stashForkIntent = (url: URL = new URL(window.location.href)): void => {
  const publicId = url.searchParams.get(Publication.FORK_PARAM);
  if (!publicId) {
    return;
  }
  const path = url.searchParams.get(Publication.PATH_PARAM) ?? undefined;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ publicId, path, at: Date.now() } satisfies PendingFork));
  } catch (error) {
    log.warn('could not keep the fork intent', { error });
  }
  url.searchParams.delete(Publication.FORK_PARAM);
  url.searchParams.delete(Publication.PATH_PARAM);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
};

/** Removes and returns the pending fork, if one is fresh. */
export const takeForkIntent = (now = Date.now()): PendingFork | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    const pending = raw ? (JSON.parse(raw) as PendingFork) : undefined;
    return pending && typeof pending.publicId === 'string' && now - pending.at < MAX_AGE_MS ? pending : undefined;
  } catch {
    return undefined;
  }
};
