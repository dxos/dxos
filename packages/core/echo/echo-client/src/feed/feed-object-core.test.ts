//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Entity, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { FeedProtocol } from '@dxos/protocols';

import { FeedObjectCore, positionOfJSON } from './feed-object-core.ts';

describe('FeedObjectCore', () => {
  // Large enough that retaining the canonical JSON per object would dominate the object itself —
  // the reason reconciliation compares digests (DX-1148).
  const LARGE_PAYLOAD = 'x'.repeat(512 * 1024);

  test('an inbound read of identical content leaves the entity untouched', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: LARGE_PAYLOAD });
    const core = new FeedObjectCore(entity, () => {});

    const inbound = Obj.make(TestSchema.Person, { name: LARGE_PAYLOAD });
    core.reconcile(inbound, jsonOf(inbound));

    expect(entity.name).toEqual(LARGE_PAYLOAD);
    core.dispose();
  });

  test('an inbound read with differing content is applied', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: LARGE_PAYLOAD });
    const core = new FeedObjectCore(entity, () => {});

    const inbound = Obj.make(TestSchema.Person, { name: `${LARGE_PAYLOAD}!` });
    core.reconcile(inbound, jsonOf(inbound));

    expect(entity.name).toEqual(`${LARGE_PAYLOAD}!`);
    core.dispose();
  });

  test("a pending append's own echo roundtrips, and a stale unordered read does not clobber it", ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const { json } = core.captureForAppend();

    // An unordered remote read that is not our echo is ignored while the append is unconfirmed.
    const other = Obj.make(TestSchema.Person, { name: 'other' });
    core.reconcile(other, jsonOf(other));
    expect(entity.name).toEqual('v2');

    // Our own append coming back is recognised by digest, clearing the pending slot.
    const echo = Obj.make(TestSchema.Person, { name: 'v2' });
    core.reconcile(echo, json);
    expect(entity.name).toEqual('v2');

    // With nothing pending, the next differing read is adopted.
    const next = Obj.make(TestSchema.Person, { name: 'v3' });
    core.reconcile(next, jsonOf(next));
    expect(entity.name).toEqual('v3');
    core.dispose();
  });

  test('revertCapture only clears the pending slot for the write it names', ({ expect }) => {
    const entity = Obj.make(TestSchema.Person, { name: 'v1' });
    const core = new FeedObjectCore(entity, () => {});

    Obj.update(entity, (entity) => {
      entity.name = 'v2';
    });
    const { token } = core.captureForAppend();
    core.revertCapture(`${token}-stale`);

    // Still dirty (reverted), so an inbound read must not win over the unappended local change.
    const remote = Obj.make(TestSchema.Person, { name: 'remote' });
    core.reconcile(remote, jsonOf(remote));
    expect(entity.name).toEqual('v2');
    core.dispose();
  });

  test('a block is settled once applied, and a newer block is not', ({ expect }) => {
    const entity = withPosition(Obj.make(TestSchema.Person, { name: 'v1' }), 1);
    const core = new FeedObjectCore(entity, () => {});
    expect(positionOfJSON(jsonOf(entity))).toEqual(1);
    expect(core.isSettledAt(1)).toBe(true);
    expect(core.isSettledAt(undefined)).toBe(false);

    const next = withPosition(Obj.make(TestSchema.Person, { name: 'v2' }), 2);
    expect(core.isSettledAt(positionOfJSON(jsonOf(next)))).toBe(false);
    core.reconcile(next, jsonOf(next));
    expect(entity.name).toEqual('v2');
    expect(core.isSettledAt(2)).toBe(true);

    // A local change unappended makes every inbound block ignorable.
    Obj.update(entity, (entity) => {
      entity.name = 'local';
    });
    expect(core.isSettledAt(3)).toBe(true);
    core.dispose();
  });
});

const withPosition = <T extends Obj.Any>(obj: T, position: number): T => {
  Obj.update(obj, (obj) => {
    Obj.getMeta(obj).keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: String(position) });
  });
  return obj;
};

const jsonOf = (entity: Entity.Unknown): Record<string, unknown> => Entity.toJSON(entity) as Record<string, unknown>;
