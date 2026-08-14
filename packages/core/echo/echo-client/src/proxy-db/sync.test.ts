//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Err, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';
import { type RemoteIndexSync } from './database';

/** Records what the database asked EDGE to wait for, and answers with a scripted verdict. */
const makeRemoteIndexSync = (
  answers: { indexed: boolean; pending: string[] }[],
): RemoteIndexSync & { calls: { documents: Record<string, string[]>; timeoutMs: number }[] } => {
  const calls: { documents: Record<string, string[]>; timeoutMs: number }[] = [];
  return {
    calls,
    awaitIndexed: async (_spaceId, request) => {
      calls.push(request);
      return answers[Math.min(calls.length - 1, answers.length - 1)];
    },
  };
};

describe('Database.sync', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('resolves once the remote reports the documents indexed', async ({ expect }) => {
    const remoteIndexSync = makeRemoteIndexSync([{ indexed: true, pending: [] }]);
    await using peer = await builder.createPeer();
    const client = await peer.createClient({ remoteIndexSync });
    const db = await peer.createDatabase(PublicKey.random(), { client });

    const object = db.add(Obj.make(TestSchema.Expando, { name: 'trigger' }));
    await db.sync({ to: 'edge', entities: [Obj.getURI(object)], indexed: true });

    expect(remoteIndexSync.calls).toHaveLength(1);
    // Scoped to the object's own document, not the whole space.
    expect(Object.keys(remoteIndexSync.calls[0].documents)).toHaveLength(1);
  });

  test('fails with SyncTimeoutError while the remote stays behind', async ({ expect }) => {
    const remoteIndexSync = makeRemoteIndexSync([{ indexed: false, pending: ['doc-1'] }]);
    await using peer = await builder.createPeer();
    const client = await peer.createClient({ remoteIndexSync });
    const db = await peer.createDatabase(PublicKey.random(), { client });

    const object = db.add(Obj.make(TestSchema.Expando, { name: 'trigger' }));
    await expect(db.sync({ to: 'edge', entities: [Obj.getURI(object)], indexed: true, timeout: 50 })).rejects.toThrow(
      Err.SyncTimeoutError,
    );
  });

  test('replication-only sync does not consult the remote index', async ({ expect }) => {
    const remoteIndexSync = makeRemoteIndexSync([{ indexed: true, pending: [] }]);
    await using peer = await builder.createPeer();
    const client = await peer.createClient({ remoteIndexSync });
    const db = await peer.createDatabase(PublicKey.random(), { client });

    db.add(Obj.make(TestSchema.Expando, { name: 'trigger' }));
    await db.sync();

    expect(remoteIndexSync.calls).toHaveLength(0);
  });

  test('an indexed sync without an EDGE transport reports a timeout rather than success', async ({ expect }) => {
    await using peer = await builder.createPeer();
    const db = await peer.createDatabase(PublicKey.random());

    const object = db.add(Obj.make(TestSchema.Expando, { name: 'trigger' }));
    await expect(db.sync({ entities: [Obj.getURI(object)], indexed: true })).rejects.toThrow(Err.SyncTimeoutError);
  });
});
