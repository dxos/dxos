//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type LandChangeHandler, type PullRequest } from '../src/types.ts';

// The subset of the Artifact runtime (contract 0.2.98) this page calls; the platform serves the full definitions.

type DocumentSnapshot = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type Unsubscribe = () => void;
type Db = {
  doc(path: string): { set(data: Record<string, unknown>): Promise<void> };
  collection(path: string): {
    onSnapshot(next: (snap: { docs: DocumentSnapshot[] }) => void, error?: (error: unknown) => void): Unsubscribe;
  };
};
type Anchor = { path: string; x: number; y: number };
type Comments = {
  anchorFor(element: Element): Promise<Anchor>;
  canSendToClaude(): Promise<string>;
  sendToClaude(target: { anchor: Anchor; text: string }): Promise<{ threadId: string; commentId: string }>;
};
type User = { canEdit(): Promise<boolean> };
type Capabilities = { db: Db; comments: Comments; user: User };

declare global {
  interface Window {
    claude?: { use<K extends keyof Capabilities>(name: K): Promise<Capabilities[K] | null> };
  }
}

/** The collection the page and the session both write: `prs/<PR id>` = `{ land, ref, at }`. */
export const LAND_COLLECTION = 'prs';

/** The comment that tells the session to start or stop the `land` skill on a PR. */
export const landRequest = (pr: Pick<PullRequest, 'id' | 'ref'>, land: boolean): string =>
  land ? `Land ${pr.id} (${pr.ref}).` : `Stop landing ${pr.id} (${pr.ref}).`;

/**
 * The land toggles: what the database says each PR should be, and a handler that records a change there and sends it
 * to the session. Both are absent outside the Artifact viewer or for a viewer who cannot edit, so the page then shows
 * the state from the session file only.
 */
export const useLandActions = (): { landing: Record<string, boolean>; onLandChange?: LandChangeHandler } => {
  const [landing, setLanding] = useState<Record<string, boolean>>({});
  const [capabilities, setCapabilities] = useState<{ db: Db; comments: Comments | null }>();

  useEffect(() => {
    const claude = window.claude;
    if (!claude) {
      return;
    }
    let unsubscribe: Unsubscribe | undefined;
    let cancelled = false;
    void (async () => {
      const [db, comments, user] = await Promise.all([claude.use('db'), claude.use('comments'), claude.use('user')]);
      if (cancelled || !db) {
        return;
      }
      unsubscribe = db
        .collection(LAND_COLLECTION)
        .onSnapshot(({ docs }) =>
          setLanding(
            Object.fromEntries(docs.flatMap((doc) => (doc.exists ? [[doc.id, doc.data()?.land === true]] : []))),
          ),
        );
      if (await user?.canEdit()) {
        setCapabilities({ db, comments });
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const onLandChange = useCallback<LandChangeHandler>(
    async (pr, land, element) => {
      if (!capabilities) {
        return;
      }
      const { db, comments } = capabilities;
      // The anchor is taken first, while the click is still the viewer's own gesture; without one, the choice still lands.
      const anchor = comments ? await comments.anchorFor(element).catch(() => undefined) : undefined;
      await db.doc(`${LAND_COLLECTION}/${pr.id}`).set({ land, ref: pr.ref, at: new Date().toISOString() });
      if (!comments || !anchor || (await comments.canSendToClaude()) !== 'available') {
        console.warn(`session-board: ${pr.id} is recorded, but no comment could be sent to Claude`);
        return;
      }
      await comments.sendToClaude({ anchor, text: landRequest(pr, land) });
    },
    [capabilities],
  );

  return { landing, ...(capabilities ? { onLandChange } : {}) };
};
