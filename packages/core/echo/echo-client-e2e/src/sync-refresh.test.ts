//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { DXN, PublicKey } from '@dxos/keys';

//
// What a change arriving from elsewhere does to the objects a peer is already holding. Two clients share
// one peer, so a write on the first reaches the second the way a synced change does — through the
// document, `_onDocumentUpdate` and the target refresh — rather than through the local write path, which
// narrows itself to the key it touches.
//

class Assignee extends Type.makeObject<Assignee>(DXN.make('com.example.type.syncAssignee', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

class Holder extends Type.makeObject<Holder>(DXN.make('com.example.type.syncHolder', '0.1.0'))(
  Schema.Struct({
    value: Schema.Number,
    assignee: Ref.Ref(Assignee),
    nested: Schema.optional(Schema.Struct({ label: Schema.String })),
  }),
) {}

type Peers = {
  writer: EchoDatabase;
  reader: EchoDatabase;
};

const openPeers = async (builder: EchoTestBuilder): Promise<Peers> => {
  const peer = await builder.createPeer({ types: [Holder, Assignee] });
  const spaceKey = PublicKey.random();
  const writer = await peer.createDatabase(spaceKey);
  const client = await peer.createClient();
  const reader = await peer.openDatabase(spaceKey, writer.rootUrl, { client });
  return { writer, reader };
};

/**
 * The reader's copy of `id`. Retried: the writer's flush returns before the reader's index has caught up,
 * so a query issued straight after it can come back empty.
 */
const readerCopy = async <T extends Obj.Any>(peers: Peers, id: string): Promise<T> => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const [found] = await peers.reader.query(Filter.id(id)).run();
    if (found) {
      return found as T;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Object never reached the reader: ${id}`);
};

/** Applies `mutate` on the writer and resolves once the reader's copy has been notified. */
const propagate = async (peers: Peers, held: Obj.Any, mutate: () => void): Promise<void> => {
  let notified = false;
  const unsubscribe = Obj.subscribe(held, () => {
    notified = true;
  });
  try {
    mutate();
    await peers.writer.flush();
    for (let spin = 0; spin < 2_000 && !notified; spin++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(notified).toBe(true);
  } finally {
    unsubscribe();
  }
};

describe('refresh on a change from elsewhere', { timeout: 120_000 }, () => {
  test('a ref the change did not touch keeps its identity', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peers = await openPeers(builder);

    const assignee = peers.writer.add(Obj.make(Assignee, { name: 'alice' }));
    const written = peers.writer.add(
      Obj.make(Holder, { value: 0, assignee: Ref.make(assignee), nested: { label: 'start' } }),
    );
    await peers.writer.flush();

    const held = await readerCopy<Holder>(peers, written.id);
    // Read before the change, so the ref and the nested record are materialized on the target.
    const refBefore = held.assignee;
    const nestedBefore = held.nested;
    expect(refBefore.uri).toEqual(Ref.make(assignee).uri);

    await propagate(peers, held, () => {
      Obj.update(written, (mutable) => {
        mutable.value = 1;
      });
    });

    expect(held.value).toEqual(1);
    // The change named `value`; nothing about `assignee` or `nested` moved, so the objects handed out for
    // them must be the same ones — a consumer that memoizes on a ref re-renders otherwise, on every
    // change to any other field of the object.
    expect(held.assignee).toBe(refBefore);
    expect(held.nested).toBe(nestedBefore);
  });

  test('a ref the change did touch is updated', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peers = await openPeers(builder);

    const alice = peers.writer.add(Obj.make(Assignee, { name: 'alice' }));
    const bob = peers.writer.add(Obj.make(Assignee, { name: 'bob' }));
    const written = peers.writer.add(Obj.make(Holder, { value: 0, assignee: Ref.make(alice) }));
    await peers.writer.flush();

    const held = await readerCopy<Holder>(peers, written.id);
    expect(held.assignee.uri).toEqual(Ref.make(alice).uri);

    await propagate(peers, held, () => {
      Obj.update(written, (mutable) => {
        mutable.assignee = Ref.make(bob);
      });
    });

    expect(held.assignee.uri).toEqual(Ref.make(bob).uri);
    expect((await held.assignee.load()).name).toEqual('bob');
  });

  test('a key deleted elsewhere is dropped', async () => {
    await using builder = await new EchoTestBuilder().open();
    const peers = await openPeers(builder);

    const assignee = peers.writer.add(Obj.make(Assignee, { name: 'alice' }));
    const written = peers.writer.add(
      Obj.make(Holder, { value: 0, assignee: Ref.make(assignee), nested: { label: 'start' } }),
    );
    await peers.writer.flush();

    const held = await readerCopy<Holder>(peers, written.id);
    expect(held.nested?.label).toEqual('start');

    await propagate(peers, held, () => {
      Obj.update(written, (mutable) => {
        delete mutable.nested;
      });
    });

    expect(held.nested).toBeUndefined();
    expect(Object.keys(held)).not.toContain('nested');
  });
});
