//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Entity, Obj } from '@dxos/echo';
import { EchoFeedCodec, type FeedBlockRef } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { FeedProtocol } from '@dxos/protocols';

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
});

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
