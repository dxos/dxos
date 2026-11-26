//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

export const PENDING_SPACE_INVITATION_KEY = 'dxos:onboarding:pending-space-invitation';

/** Past this the link is stale: the user abandoned the sign-in, and the invitation has likely expired. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Entry = { code: string; storedAt: number };

export type PendingSpaceInvitationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Reading `localStorage` throws where site data is blocked. */
const defaultStorage = (): PendingSpaceInvitationStorage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * A space invitation opened behind the welcome gate, held until there is an identity to redeem it with.
 * Kept in `localStorage` because a magic-link or OAuth sign-in finishes in a new tab.
 */
export class PendingSpaceInvitation {
  constructor(private readonly _storage: PendingSpaceInvitationStorage | undefined = defaultStorage()) {}

  stash(code: string): void {
    try {
      this._storage?.setItem(
        PENDING_SPACE_INVITATION_KEY,
        JSON.stringify({ code, storedAt: Date.now() } satisfies Entry),
      );
    } catch (error) {
      log.warn('could not hold space invitation', { error });
    }
  }

  /**
   * Removes and returns the held invitation. Every open tab shares one client and so sees the new identity at once;
   * the lock lets exactly one of them claim it.
   */
  async take(eligible: () => boolean = () => true): Promise<string | undefined> {
    const locks = globalThis.navigator?.locks;
    // Checked once the lock is granted, since the holder's state can change while it waits.
    const claim = () => (eligible() ? this._claim() : undefined);
    try {
      return locks ? await locks.request(PENDING_SPACE_INVITATION_KEY, claim) : claim();
    } catch (error) {
      log.warn('could not claim held space invitation', { error });
      return undefined;
    }
  }

  private _claim(): string | undefined {
    try {
      const raw = this._storage?.getItem(PENDING_SPACE_INVITATION_KEY);
      if (!raw) {
        return undefined;
      }
      this._storage?.removeItem(PENDING_SPACE_INVITATION_KEY);
      const entry: Partial<Entry> = JSON.parse(raw);
      if (typeof entry.code !== 'string' || typeof entry.storedAt !== 'number') {
        return undefined;
      }
      return Date.now() - entry.storedAt < MAX_AGE_MS ? entry.code : undefined;
    } catch (error) {
      log.warn('could not read held space invitation', { error });
      return undefined;
    }
  }
}
