//
// Copyright 2025 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import { EntityId } from '@dxos/keys';

import { EchoTestBuilder } from '../testing/index.ts';

describe('EchoClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // An index hit carries no document id when the host's result omits one, and a close settles the
  // wait with `undefined` — so the two match and the load must still stop.
  for (const documentId of ['some-other-document', undefined]) {
    test(`a wait for a space-root link settles when the database closes under it (documentId: ${documentId})`, async () => {
      await using builder = new EchoTestBuilder();
      await builder.open();
      const { peer, db } = await builder.createDatabase();

      // The fallback timer resolves the wait on its own, so only the timer's disappearance shows
      // that the close is what settled it.
      vi.useFakeTimers();
      const timersBeforeWait = vi.getTimerCount();

      // An id the space root does not route anywhere parks the load on `_waitForObjectLink`.
      const pending = peer.client['_loadObjectFromDocument']({
        spaceId: db.spaceId,
        objectId: EntityId.random(),
        documentId,
      });
      // The load awaits the same trigger before arming the wait, so once this resolves it is armed.
      await db.opened.wait();

      await db.close();

      expect(vi.getTimerCount()).toBe(timersBeforeWait);
      // Before the close was wired in, the wait's timer outlived the database and asserted on the
      // released space root handle instead.
      await expect(pending).resolves.toBeUndefined();
    });
  }
});
