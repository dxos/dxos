//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { type Space as Halo } from '@dxos/halo';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { unpackJson } from '@dxos/protocols/buf';

/**
 * Composer's presence channel: every client posts the objects it has open, so its plank headings and this app show
 * the same viewers.
 */
const CHANNEL = 'viewing';
const BROADCAST_INTERVAL = 30_000;
const EXPIRY = 2 * BROADCAST_INTERVAL;
const REFRESH_INTERVAL = 5_000;

/** An online member of the space; `currentlyAttended` when they show the same diagram as this client. */
export type Viewer = Halo.Member & { lastSeen: number; currentlyAttended: boolean };

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * Announces that this client shows `objectId`, and returns the space's other online members, those who show it too
 * first.
 */
export const useViewers = (space: Space, objectId: string | undefined): Viewer[] => {
  const identityKey = useIdentity()?.identityKey;
  const members = useMembers(space.id);
  // When each peer last announced `objectId`.
  const [seen, setSeen] = useState<Readonly<Record<string, number>>>({});
  const [now, setNow] = useState(Date.now);
  const key = objectId ? EID.make({ spaceId: space.id, entityId: objectId }) : undefined;

  useEffect(() => {
    if (!key || !identityKey) {
      return;
    }
    const post = (added: string[], removed: string[]) =>
      space
        .postMessage(CHANNEL, { identityKey, attended: added, added, removed })
        .catch((err) => log.warn('presence not posted', { err }));
    void post([key], []);
    // Peers expire a viewer it stops hearing from, so the announcement repeats.
    const interval = setInterval(() => void post([key], []), BROADCAST_INTERVAL);
    return () => {
      clearInterval(interval);
      void post([], [key]);
    };
  }, [space, key, identityKey]);

  useEffect(() => {
    setSeen({});
    if (!key) {
      return;
    }
    return space.listen(CHANNEL, (message) => {
      const payload = unpackJson(message.payload) ?? {};
      const peer = typeof payload.identityKey === 'string' ? payload.identityKey : undefined;
      if (!peer || peer === identityKey) {
        return;
      }
      if (strings(payload.added).includes(key)) {
        setSeen((prev) => ({ ...prev, [peer]: Date.now() }));
      } else if (strings(payload.removed).includes(key)) {
        setSeen(({ [peer]: _, ...rest }) => rest);
      }
    });
  }, [space, key, identityKey]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return useMemo(
    () =>
      members
        .flatMap((member) => {
          const lastSeen = member.identityKey ? seen[member.identityKey] : undefined;
          if (!member.online || !member.identityKey || member.identityKey === identityKey) {
            return [];
          }
          const here = lastSeen !== undefined && now - lastSeen < EXPIRY;
          return [{ ...member, lastSeen: lastSeen ?? 0, currentlyAttended: here }];
        })
        .toSorted(
          (left, right) =>
            Number(right.currentlyAttended) - Number(left.currentlyAttended) ||
            (left.identityKey ?? '').localeCompare(right.identityKey ?? ''),
        ),
    [members, identityKey, seen, now],
  );
};
