//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Entity, Feed, Obj } from '@dxos/echo';
import { EchoFeedCodec, type FeedBlockRef } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { FeedProtocol } from '@dxos/protocols';

import { FeedBranchMismatchError } from '../errors.ts';
import { FeedObjectCore } from './feed-object-core.ts';

describe('FeedObjectCore', () => {
  test('a re-read of the applied block needs no decode, and adopts a position it gained', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 1 });
    const core = new FeedObjectCore(entity, () => {});

    expect(core.accepts({ actorId: 'a', sequence: 1 })).toBe(false);
    expect(core.accepts({ actorId: 'a', sequence: 1, position: 7 })).toBe(false);
    expect(positionOf(entity)).toEqual('7');
    core.dispose();
  });

  test('a newer block is applied and an older one ignored', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v2' }), { actorId: 'a', sequence: 2 });
    const core = new FeedObjectCore(entity, () => {});

    expect(core.accepts({ actorId: 'b', sequence: 1 })).toBe(false);

    const next: FeedBlockRef = { actorId: 'b', sequence: 3 };
    expect(core.accepts(next)).toBe(true);
    core.reconcile(Obj.make(TestSchema.Person, { name: 'v3' }), next);
    expect(entity.name).toEqual('v3');
    expect(core.accepts(next)).toBe(false);
    core.dispose();
  });

  test('positions order blocks where both have one', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 5, position: 10 });
    const core = new FeedObjectCore(entity, () => {});

    expect(core.accepts({ actorId: 'b', sequence: 9, position: 4 })).toBe(false);
    expect(core.accepts({ actorId: 'b', sequence: 1, position: 11 })).toBe(true);
    core.dispose();
  });

  test('blocks written concurrently at the same sequence keep the current state', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'mine' }), { actorId: 'a', sequence: 4 });
    const core = new FeedObjectCore(entity, () => {});

    expect(core.accepts({ actorId: 'b', sequence: 4 })).toBe(false);
    core.dispose();
  });

  test('an unsent local change wins over every inbound block', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 1 });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'local';
    });
    expect(core.accepts({ actorId: 'b', sequence: 9, position: 99 })).toBe(false);
    core.dispose();
  });

  test('a confirmed append names its block, so its echo is settled and later blocks order after it', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 1 });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const { token } = core.captureForAppend();

    // While in flight, an unordered read is stale.
    expect(core.accepts({ actorId: 'b', sequence: 2 })).toBe(false);

    core.confirmAppend(token, EchoFeedCodec.blockId('a', 2));
    expect(core.accepts({ actorId: 'a', sequence: 2 })).toBe(false);
    expect(core.accepts({ actorId: 'a', sequence: 1 })).toBe(false);

    const next: FeedBlockRef = { actorId: 'b', sequence: 3 };
    expect(core.accepts(next)).toBe(true);
    core.reconcile(Obj.make(TestSchema.Person, { name: 'v3' }), next);
    expect(entity.name).toEqual('v3');
    core.dispose();
  });

  test('an echo of a superseded write does not override the write that replaced it', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const first = core.captureForAppend();
    Obj.update(entity, (entity) => {
      entity.name = 'v3';
    });
    const second = core.captureForAppend();

    // The first write lands after the second was captured, and the store then echoes it back ordered.
    core.confirmAppend(first.token, EchoFeedCodec.blockId('a', 1));
    expect(core.accepts({ actorId: 'a', sequence: 1, position: 5 })).toBe(false);
    expect(entity.name).toEqual('v3');

    core.confirmAppend(second.token, EchoFeedCodec.blockId('a', 2));
    expect(core.accepts({ actorId: 'a', sequence: 2 })).toBe(false);
    core.dispose();
  });

  test('a superseded write that lands keeps the position its state was ordered after', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 1, position: 10 });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const first = core.captureForAppend();
    Obj.update(entity, (entity) => {
      entity.name = 'v3';
    });
    core.captureForAppend();
    core.confirmAppend(first.token, EchoFeedCodec.blockId('a', 2));

    // Both blocks are ordered at or before the state the pending write was captured from.
    expect(core.accepts({ actorId: 'a', sequence: 1, position: 10 })).toBe(false);
    expect(core.accepts({ actorId: 'b', sequence: 5, position: 9 })).toBe(false);
    expect(core.accepts({ actorId: 'b', sequence: 1, position: 11 })).toBe(true);
    expect(entity.name).toEqual('v3');
    core.dispose();
  });

  test('an append whose store reports no block id waits for a block ordered after the current state', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { position: 3 });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const { token } = core.captureForAppend();
    core.confirmAppend(token, undefined);

    expect(core.accepts({ position: 2 })).toBe(false);
    expect(core.accepts({ position: 3 })).toBe(false);

    const echo: FeedBlockRef = { position: 4 };
    expect(core.accepts(echo)).toBe(true);
    core.reconcile(Obj.make(TestSchema.Person, { name: 'v2' }), echo);
    expect(core.accepts(echo)).toBe(false);
    core.dispose();
  });

  test('a write is acknowledged once the store holds it, and not while an edit or capture is outstanding', ({
    expect,
  }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    expect(core.acknowledged).toBe(false);

    const { token } = core.captureForAppend();
    expect(core.acknowledged).toBe(false);
    core.confirmAppend(token, 'block-1');
    expect(core.acknowledged).toBe(true);

    const next = core.captureForAppend();
    core.confirmAppend(next.token, undefined);
    expect(core.acknowledged).toBe(true);
    core.dispose();
  });

  test('revertCapture only clears the pending slot for the write it names', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const { token } = core.captureForAppend();
    core.revertCapture(token + 1);

    // Still dirty (reverted), so an inbound read must not win over the unappended local change.
    expect(core.accepts({ actorId: 'b', sequence: 1, position: 1 })).toBe(false);
    expect(entity.name).toEqual('v2');
    core.dispose();
  });

  test('a subscription reposition applies only to the block the core reflects', ({ expect }) => {
    const entity = stamped(Obj.make(TestSchema.Person, { name: 'v1' }), { actorId: 'a', sequence: 1 });
    const core = new FeedObjectCore(entity, () => {});

    core.reposition(EchoFeedCodec.blockId('a', 0), 5);
    expect(positionOf(entity)).toBeUndefined();
    core.reposition(EchoFeedCodec.blockId('a', 1), 6);
    expect(positionOf(entity)).toEqual('6');
    core.dispose();
  });

  test('a write that states another branch is rejected', ({ expect }) => {
    const entity = withBranch(Obj.make(TestSchema.Person, { name: 'v1' }), '3@a');
    const core = new FeedObjectCore(stamped(entity, { actorId: 'a', sequence: 3 }), () => {});

    const sameBranch = withBranch(Obj.make(TestSchema.Person, { id: entity.id, name: 'v2' }), '3@a');
    expect(core.checkBranch(sameBranch)).toBeUndefined();

    const onRoot = Obj.make(TestSchema.Person, { id: entity.id, name: 'v2' });
    expect(core.checkBranch(onRoot)).toBeInstanceOf(FeedBranchMismatchError);

    const elsewhere = withBranch(Obj.make(TestSchema.Person, { id: entity.id, name: 'v2' }), '7@b');
    expect(core.checkBranch(elsewhere)).toBeInstanceOf(FeedBranchMismatchError);
    core.dispose();
  });

  test('a local edit of the branch key is reverted at capture and reported', ({ expect }) => {
    const entity = withBranch(Obj.make(TestSchema.Person, { name: 'v1' }), '3@a');
    const core = new FeedObjectCore(stamped(entity, { actorId: 'a', sequence: 3 }), () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    withBranch(entity, undefined);
    const { json, rejected } = core.captureForAppend();
    expect(rejected).toBeInstanceOf(FeedBranchMismatchError);
    expect(Feed.getBranch(entity)).toEqual('3@a');
    expect(EchoFeedCodec.writeIntentOf(json)).toEqual({ branch: '3@a' });
    expect(entity.name).toEqual('v2');
    core.dispose();
  });

  test('a new object takes its branch from its first write', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});
    withBranch(entity, '3@a');
    expect(core.captureForAppend().rejected).toBeUndefined();

    withBranch(entity, undefined);
    expect(core.captureForAppend().rejected).toBeInstanceOf(FeedBranchMismatchError);
    core.dispose();
  });

  test('a fork asks the store for a base block until a write lands, then continues the new branch', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});
    core.requestFork('0@a');

    const first = core.captureForAppend();
    expect(EchoFeedCodec.writeIntentOf(first.json)).toEqual({ forkAt: '0@a' });
    // A failed write is captured again, and still forks.
    core.revertCapture(first.token);
    const retry = core.captureForAppend();
    expect(EchoFeedCodec.writeIntentOf(retry.json)).toEqual({ forkAt: '0@a' });
    expect(Feed.getBranch(entity)).toBeUndefined();

    core.confirmAppend(retry.token, '4@a', '0@a');
    expect(core.branch).toEqual('4@a');
    // The keys a read of the block would carry are stamped at once.
    expect(Feed.getBranch(entity)).toEqual('4@a');
    expect(Feed.getBlockId(entity)).toEqual('4@a');
    expect(Feed.isFork(entity)).toBe(true);
    expect(Feed.getPredecessor(entity)).toEqual('0@a');

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    expect(EchoFeedCodec.writeIntentOf(core.captureForAppend().json)).toEqual({ branch: '4@a' });
    core.dispose();
  });
});

/** Sets, or with `undefined` removes, the branch key of an object, as a writer or the store would. */
const withBranch = <T extends Obj.Any>(obj: T, branch: string | undefined): T => {
  Obj.update(obj, (obj) => {
    const keys = Obj.getMeta(obj).keys;
    for (let index = keys.length - 1; index >= 0; index--) {
      if (keys[index].source === FeedProtocol.KEY_FEED_BRANCH) {
        keys.splice(index, 1);
      }
    }
    if (branch !== undefined) {
      keys.push({ source: FeedProtocol.KEY_FEED_BRANCH, id: branch });
    }
  });
  return obj;
};

/** Stamps an object's `@meta` the way a store stamps an object it decoded from a block. */
const stamped = <T extends Obj.Any>(obj: T, ref: FeedBlockRef): T => {
  Obj.update(obj, (obj) => {
    const keys = Obj.getMeta(obj).keys;
    if (ref.actorId !== undefined && ref.sequence !== undefined) {
      keys.push({ source: FeedProtocol.KEY_FEED_BLOCK, id: EchoFeedCodec.blockId(ref.actorId, ref.sequence) });
    }
    if (ref.position !== undefined) {
      keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: String(ref.position) });
    }
  });
  return obj;
};

const positionOf = (entity: Entity.Unknown): string | undefined =>
  Entity.getKeys(entity, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id;
