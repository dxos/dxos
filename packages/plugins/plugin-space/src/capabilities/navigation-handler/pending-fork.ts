//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { PublicationManifest } from '#types';

/**
 * A fork waits here while the visitor signs in. Local storage rather than session storage, since a
 * magic-link sign-in lands in a new tab.
 */
const STORAGE_KEY = 'org.dxos.plugin.space.pending-fork';

const MAX_AGE_MS = 60 * 60 * 1_000;

export type PendingFork = { publicId: string; path?: string; at: number };

/** Moves a fork link's params from the address bar into storage. */
export const saveForkLink = (url: URL): void => {
  const publicId = url.searchParams.get(PublicationManifest.FORK_PARAM);
  if (!publicId) {
    return;
  }
  const path = url.searchParams.get(PublicationManifest.PATH_PARAM) ?? undefined;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ publicId, path, at: Date.now() } satisfies PendingFork));
  } catch (error) {
    log.warn('could not keep the fork link', { error });
  }
  const current = new URL(window.location.href);
  current.searchParams.delete(PublicationManifest.FORK_PARAM);
  current.searchParams.delete(PublicationManifest.PATH_PARAM);
  history.replaceState(null, '', current.pathname + current.search + current.hash);
};

export const hasPendingFork = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export const takePendingFork = (now = Date.now()): PendingFork | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    const pending = raw ? (JSON.parse(raw) as PendingFork) : undefined;
    return pending && typeof pending.publicId === 'string' && now - pending.at < MAX_AGE_MS ? pending : undefined;
  } catch {
    return undefined;
  }
};
