//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';
import { MirrorRepo } from './mirror-repo.ts';

/**
 * A mirror tab hands one document to code written against the Automerge API as a real replica,
 * while every other document stays a mirror and other tabs keep mirrors of it.
 */
describe('replica on demand', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('the full Automerge API works on a replica and mirrors converge with it', async () => {
    const peer = await builder.createPeer();
    const spaceKey = PublicKey.random();
    const tabA = await peer.createDatabase(spaceKey, { client: await peer.createClient({ mirror: true }) });
    const tabB = await peer.openDatabase(spaceKey, tabA.getSpaceRootDocHandle().url, {
      client: await peer.createClient({ mirror: true }),
    });
    const doc = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    const other = tabA.add(Obj.make(TestSchema.Expando, { title: 'stays a mirror' }));
    await tabA.flush();

    const core = getObjectCore(doc);
    const repo = tabA._repo;
    invariant(repo instanceof MirrorRepo && core.docHandle?.documentId, 'tab A is not a mirror client');
    const replica = await repo.replica<DatabaseDirectory>(core.docHandle.documentId);
    const path = [...core.mountPath, 'data', 'content'];

    // What libraries and tooling call: history, heads, diff, op-id cursors, splice.
    const before = A.getHeads(replica.doc());
    const cursor = A.getCursor(replica.doc(), [...path], 6);
    replica.change((draft) => A.splice(draft, [...path], 0, 0, 'Say: '));
    const patches = A.diff(replica.doc(), before, A.getHeads(replica.doc()));
    expect(patches.some((patch) => patch.action === 'splice')).toBe(true);
    expect(A.getCursorPosition(replica.doc(), [...path], cursor)).toBe(11);
    expect(A.getHistory(replica.doc()).length).toBeGreaterThan(1);

    // The mirror in the same tab and another tab's mirror converge with the replica's write.
    await tabA.flush();
    await expect.poll(() => doc.content).toBe('Say: hello world');
    const [inB] = await tabB.query(Filter.id(doc.id)).run();
    await expect.poll(() => inB?.content).toBe('Say: hello world');

    // And the other way: a mirror write reaches the replica.
    Obj.update(inB, (inB) => {
      inB.content = 'replaced by tab B';
    });
    await tabB.flush();
    await expect.poll(() => replica.doc().objects?.[doc.id]?.data?.content).toBe('replaced by tab B');

    // Only the document handed over has a replica.
    expect(getObjectCore(other).docHandle?.constructor.name).toBe('MirrorDocHandle');
    expect(repo.releaseReplica(core.docHandle.documentId)).toBe(true);
  });
});
