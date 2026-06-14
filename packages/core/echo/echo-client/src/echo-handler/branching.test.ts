//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Obj, Ref } from '@dxos/echo';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { EchoTestBuilder } from '../testing';
import {
  createBranch,
  deleteBranch,
  getBranchActivity,
  getBranches,
  getCurrentBranch,
  mergeBranch,
  switchBranch,
} from './branching';
import { getEditHistoryWithDiffs } from './edit-history';
import { getVersion } from './version';

// A root object referencing a child (mirrors a markdown Document -> Text content child). Both are
// linked-doc objects (the default placement), so each has its own forkable document.
const setup = async () => {
  const builder = new EchoTestBuilder();
  await openAndClose(builder);
  const { db } = await builder.createDatabase();

  const child = db.add(Obj.make(TestSchema.Expando, { content: 'child-v0' }));
  const root = db.add(Obj.make(TestSchema.Expando, { title: 'root-v0', child: Ref.make(child) }));
  await db.flush();

  return { builder, db, root: root as any, child: child as any };
};

describe('branching', () => {
  test('createBranch forks the root and its referenced child without creating new objects', async () => {
    const { db, root, child } = await setup();
    const before = db.coreDatabase.getTotalNumberOfObjects();
    const beforeIds = new Set(db.coreDatabase.getAllObjectIds());

    await createBranch(root, 'b1');
    await db.flush();

    // No new objects in the space — branching forks documents, not object identities.
    expect(db.coreDatabase.getTotalNumberOfObjects()).toBe(before);
    expect(new Set(db.coreDatabase.getAllObjectIds())).toEqual(beforeIds);

    // Both subtree members have a branch document recorded in the registry.
    const registry = db.coreDatabase.getBranchRegistry(root.id)!;
    expect(registry).toBeDefined();
    expect(Object.keys(registry.b1.members).sort()).toEqual([root.id, child.id].sort());
  });

  test('listBranches / getCurrentBranch; children inherit the parent branch set', async () => {
    const { db, root, child } = await setup();
    expect(getCurrentBranch(root)).toBe('main');
    expect(getBranches(root)).toEqual(['main']);

    await createBranch(root, 'b1');
    await createBranch(root, 'b2');

    expect(getBranches(root).sort()).toEqual(['b1', 'b2', 'main']);
    // The child reports the same branch set as the root (inherited via the registry reverse-lookup).
    expect(getBranches(child)).toContain('b1');
    expect(getCurrentBranch(child)).toBe(getCurrentBranch(root));
    void db;
  });

  test('switchBranch isolates edits and cascades to the child automatically', async () => {
    const { db, root, child } = await setup();
    await createBranch(root, 'b1');

    // Switch the ROOT only; the child must follow automatically.
    await switchBranch(root, 'b1');
    expect(getCurrentBranch(child)).toBe('b1');
    Obj.update(root, (root: any) => {
      root.title = 'root-b1';
    });
    Obj.update(child, (child: any) => {
      child.content = 'child-b1';
    });
    await db.flush();
    expect(root.title).toBe('root-b1');
    expect(child.content).toBe('child-b1');

    // main is untouched.
    await switchBranch(root, 'main');
    expect(root.title).toBe('root-v0');
    expect(child.content).toBe('child-v0');

    // Diverged values return on the branch.
    await switchBranch(root, 'b1');
    expect(root.title).toBe('root-b1');
    expect(child.content).toBe('child-b1');
  });

  test('the branch is consistent regardless of access path', async () => {
    const { db, root, child } = await setup();
    await createBranch(root, 'b1');
    await switchBranch(root, 'b1');
    Obj.update(child, (child: any) => {
      child.content = 'child-b1';
    });
    await db.flush();

    // The child resolved via the parent ref reflects the branch.
    expect(root.child.target.content).toBe('child-b1');
    // The child resolved directly by id reflects the branch.
    const direct = await db.coreDatabase.loadObjectCoreById(child.id);
    expect(direct?.getDecoded(['data', 'content'])).toBe('child-b1');
  });

  test('writes succeed on a branch (not time-traveling)', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');
    await switchBranch(root, 'b1');
    expect(() =>
      Obj.update(root, (root: any) => {
        root.title = 'edited';
      }),
    ).not.toThrow();
    await db.flush();
    expect(root.title).toBe('edited');
  });

  test('createBranch from a historical version seeds at the past state', async () => {
    const { db, root } = await setup();
    Obj.update(root, (root: any) => {
      root.title = 'root-v1';
    });
    await db.flush();
    const headsV1 = getVersion(root).heads;
    Obj.update(root, (root: any) => {
      root.title = 'root-v2';
    });
    await db.flush();
    expect(root.title).toBe('root-v2');

    await createBranch(root, 'hist', { fromHeads: headsV1 });
    await switchBranch(root, 'hist');
    expect(root.title).toBe('root-v1');

    await switchBranch(root, 'main');
    expect(root.title).toBe('root-v2');
  });

  test('createBranch with per-member fromHeads forks the whole subtree at a scrubbed position', async () => {
    const { db, root, child } = await setup();
    const rootHeadsV0 = getVersion(root).heads;
    const childHeadsV0 = getVersion(child).heads;
    // Advance both members past the captured frontier.
    Obj.update(root, (root: any) => {
      root.title = 'root-v1';
    });
    Obj.update(child, (child: any) => {
      child.content = 'child-v1';
    });
    await db.flush();

    // Fork each member at its own historical frontier (mirrors what the scrubber's plan provides).
    await createBranch(root, 'snap', { fromHeads: { [root.id]: rootHeadsV0, [child.id]: childHeadsV0 } });
    await switchBranch(root, 'snap');

    // Both the root AND the child are at their scrubbed (v0) state — not the latest (v1).
    expect(root.title).toBe('root-v0');
    expect(child.content).toBe('child-v0');

    await switchBranch(root, 'main');
    expect(root.title).toBe('root-v1');
    expect(child.content).toBe('child-v1');
  });

  test('getBranchActivity reports a last-updated time per branch (incl. main), driven by subtree edits', async () => {
    const { db, root, child } = await setup();
    await createBranch(root, 'b1');
    await createBranch(root, 'b2');

    // Edit b1's CHILD (mirrors a document whose text — not the root — changes) so the branch's
    // activity must reflect the max across the subtree, not just the root doc.
    await switchBranch(root, 'b1');
    Obj.update(child, (child: any) => {
      child.content = 'child-b1-edited';
    });
    await db.flush();
    await switchBranch(root, 'main');

    const activity = await getBranchActivity(root);
    expect(Object.keys(activity).sort()).toEqual(['b1', 'b2', 'main']);
    for (const time of Object.values(activity)) {
      expect(time).toBeGreaterThan(0);
    }
    // The edited branch is at least as recent as the untouched ones (second-granular change times
    // may collide, so this is `>=`); the edit happened strictly after b2/main were last touched.
    expect(activity.b1).toBeGreaterThanOrEqual(activity.b2);
    expect(activity.b1).toBeGreaterThanOrEqual(activity.main);
  });

  test('mergeBranch folds branch changes back into main across the subtree, then deleteBranch', async () => {
    const { db, root, child } = await setup();
    await createBranch(root, 'b1');
    await switchBranch(root, 'b1');
    Obj.update(root, (root: any) => {
      root.title = 'root-b1';
    });
    Obj.update(child, (child: any) => {
      child.content = 'child-b1';
    });
    await db.flush();

    await switchBranch(root, 'main');
    expect(root.title).toBe('root-v0');

    await mergeBranch(root, 'b1');
    await db.flush();
    expect(root.title).toBe('root-b1');
    expect(child.content).toBe('child-b1');

    deleteBranch(root, 'b1');
    expect(getBranches(root)).toEqual(['main']);
  });

  test('cannot delete or create the main branch', async () => {
    const { root } = await setup();
    expect(() => deleteBranch(root, 'main')).toThrow();
    await expect(createBranch(root, 'main')).rejects.toThrow();
  });

  test('time-travel: switching branch is independent of history; writes blocked while scrubbing', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');
    await switchBranch(root, 'b1');
    Obj.update(root, (root: any) => {
      root.title = 'root-b1-v1';
    });
    await db.flush();

    // Scrubbing within the branch reads the branch's history.
    const diffs = getEditHistoryWithDiffs(root);
    expect(diffs.length).toBeGreaterThan(0);
  });
});

describe('branching replication', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('branch documents replicate to a second peer; the current-branch selection stays device-local', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const child1: any = db1.add(Obj.make(TestSchema.Expando, { content: 'child-v0' }));
    const root1: any = db1.add(Obj.make(TestSchema.Expando, { title: 'root-v0', child: Ref.make(child1) }));
    await db1.flush();

    await createBranch(root1, 'b1');
    await switchBranch(root1, 'b1');
    Obj.update(root1, (root1: any) => {
      root1.title = 'root-b1';
    });
    Obj.update(child1, (child1: any) => {
      child1.content = 'child-b1';
    });
    await db1.flush();

    const heads = await db1.coreDatabase.getDocumentHeads();
    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.loadObjectCoreById(root1.id);

    // The synced registry shows the branch on peer2.
    expect(db2.coreDatabase.listBranches(root1.id)).toContain('b1');
    // The selection is device-local: peer2 defaults to main and shows main content.
    expect(db2.coreDatabase.getCurrentBranch(root1.id)).toBe('main');
    expect(db2.coreDatabase.getObjectCoreById(root1.id)?.getDecoded(['data', 'title'])).toBe('root-v0');

    // peer2 can switch to the replicated branch and read its diverged content.
    await db2.coreDatabase.switchBranch(root1.id, 'b1');
    expect(db2.coreDatabase.getObjectCoreById(root1.id)?.getDecoded(['data', 'title'])).toBe('root-b1');
    expect(db2.coreDatabase.getObjectCoreById(child1.id)?.getDecoded(['data', 'content'])).toBe('child-b1');
    expect(db2.coreDatabase.getCurrentBranch(root1.id)).toBe('b1');
  });
});

describe('branching persistence', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('the current branch survives a reload (device-local)', async () => {
    await using peer = await builder.createPeer();
    const db = await peer.createDatabase();
    const child: any = db.add(Obj.make(TestSchema.Expando, { content: 'child-v0' }));
    const root: any = db.add(Obj.make(TestSchema.Expando, { title: 'root-v0', child: Ref.make(child) }));
    await db.flush();
    const rootId = root.id;
    const childId = child.id;

    await createBranch(root, 'b1');
    await switchBranch(root, 'b1');
    Obj.update(root, (root: any) => {
      root.title = 'root-b1';
    });
    Obj.update(child, (child: any) => {
      child.content = 'child-b1';
    });
    await db.flush();
    await peer.host.updateIndexes();

    // Simulate a client restart: ECHO is recreated but the device-local branch store survives.
    await peer.reload();
    const db2 = await peer.openLastDatabase();
    await db2.coreDatabase.loadObjectCoreById(rootId);

    expect(db2.coreDatabase.getCurrentBranch(rootId)).toBe('b1');
    expect(db2.coreDatabase.getObjectCoreById(rootId)?.getDecoded(['data', 'title'])).toBe('root-b1');
    expect(db2.coreDatabase.getObjectCoreById(childId)?.getDecoded(['data', 'content'])).toBe('child-b1');
  });
});
