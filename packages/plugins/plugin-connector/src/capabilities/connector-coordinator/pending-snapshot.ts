//
// Copyright 2026 DXOS.org
//

import { type Key } from '@dxos/echo';
import { log } from '@dxos/log';

import { pendingConnectionStorageKey } from '../../constants';

/** Snapshot of an in-flight OAuth flow persisted in `localStorage` for redirect-flow connectors. */
export type PendingSnapshot = {
  /** Absent snapshots (and legacy rows) default to `'create'`. */
  mode?: 'create' | 'reauth';
  spaceId: Key.SpaceId;
  connectorId: string;
  tokenSnapshot: { source: string; account?: string; scopes: readonly string[] };
  connectionSnapshot: { name: string; connectorId: string };
  /** Serialized DXN of the existing target to bind the first new selection to. */
  existingTargetDxn?: string;
  /** `mode: 'reauth'` only — serialized DXN of the existing AccessToken to refresh in place. */
  reauthAccessTokenDxn?: string;
};

export const writePendingSnapshot = (accessTokenId: string, snapshot: PendingSnapshot): void => {
  try {
    localStorage.setItem(pendingConnectionStorageKey(accessTokenId), JSON.stringify(snapshot));
  } catch (error) {
    log.warn('failed to persist pending connection snapshot', { error });
  }
};

export const readPendingSnapshot = (accessTokenId: string): PendingSnapshot | undefined => {
  const raw = localStorage.getItem(pendingConnectionStorageKey(accessTokenId));
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as PendingSnapshot;
  } catch (error) {
    log.warn('failed to parse pending connection snapshot', { error });
    return undefined;
  }
};

export const deletePendingSnapshot = (accessTokenId: string): void => {
  localStorage.removeItem(pendingConnectionStorageKey(accessTokenId));
};
