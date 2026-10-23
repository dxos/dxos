//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { type Client } from '@dxos/client';
import { createInitializedClientsWithContext, waitForSpace } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { Invitation_AuthMethod } from '@dxos/protocols/buf/dxos/client/invitation_pb';

describe('Spaces/sync scope', { timeout: 30_000 }, () => {
  test('a guest that joins with a scope replicates only the scoped objects until the scope grows', async ({
    expect,
  }) => {
    const [host, guest] = await createInitializedClients(2);
    await Promise.all([host, guest].map((client) => client.addTypes([TestSchema.Expando])));

    const space = await host.spaces.create();
    const shared = space.db.add(Obj.make(TestSchema.Expando, { name: 'shared' }));
    const other = space.db.add(Obj.make(TestSchema.Expando, { name: 'other' }));
    await space.db.flush();

    // Authless, as a share link's invitation is: the guest is admitted without a code.
    const invitation = space.share({ authMethod: Invitation_AuthMethod.NONE });
    guest.spaces.join(invitation.get(), { syncScope: { objectIds: [shared.id] } });
    const guestSpace = await waitForSpace(guest, space.key, { ready: true });

    const names = async () =>
      (await guestSpace.db.query(Query.type(TestSchema.Expando)).run()).map((object) => object.name).sort();
    await expect.poll(names).toContain('shared');
    // Give replication time to deliver anything it wrongly would.
    await sleep(500);
    expect(await names()).not.toContain('other');

    await guestSpace.internal.extendSyncScope([other.id]);
    await expect.poll(names, { timeout: 10_000 }).toEqual(['other', 'shared']);
  });

  const createInitializedClients = (count: number): Promise<Client[]> => {
    const context = new Context();
    onTestFinished(async () => {
      await context.dispose();
    });
    return createInitializedClientsWithContext(context, count);
  };
});
