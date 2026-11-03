//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { EntityId } from '@dxos/keys';

import { EchoTestBuilder } from '../testing/index.ts';

describe('EchoClient', () => {
  test('a wait for a space-root link settles when the database closes under it', async () => {
    await using builder = new EchoTestBuilder();
    await builder.open();
    const { peer, db } = await builder.createDatabase();

    // An id the space root does not route anywhere parks the load on `_waitForObjectLink`.
    const pending = peer.client['_loadObjectFromDocument']({
      spaceId: db.spaceId,
      objectId: EntityId.random(),
      documentId: 'some-other-document',
    });
    // The load awaits the same trigger before arming the wait, so once this resolves it is armed.
    await db.opened.wait();

    await db.close();

    // Before the close was wired in, the wait's timer outlived the database and asserted on the
    // released space root handle instead.
    await expect(pending).resolves.toBeUndefined();
  });
});
