//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Process } from '@dxos/compute';

import { ProcessStore } from './process-store';

describe('ProcessStore', () => {
  it.effect(
    'persists, lists and deletes process records across instances over the same KV',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('p1');

      const storeA = new ProcessStore(kv);
      yield* storeA.putProcess({
        id: pid,
        key: 'test.waiting',
        params: { name: 'agent', annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      });
      const seq = yield* storeA.appendEvent(pid, { _tag: 'spawn' });
      yield* storeA.setAlarm(pid, 1234);

      // Fresh instance over the SAME kv = simulated restart.
      const storeB = new ProcessStore(kv);
      const ids = yield* storeB.listProcessIds();
      expect(ids).toEqual([pid]);

      const record = yield* storeB.getProcess(pid);
      expect(record?.alarmDueAt).toEqual(1234);
      expect(record?.events).toEqual([{ seq, _tag: 'spawn' }]);

      yield* storeB.removeEvent(pid, seq);
      yield* storeB.setAlarm(pid, null);
      const record2 = yield* storeB.getProcess(pid);
      expect(record2?.events).toEqual([]);
      expect(record2?.alarmDueAt).toBeNull();

      yield* storeB.deleteProcess(pid);
      expect(yield* storeB.listProcessIds()).toEqual([]);
      expect(yield* storeB.getProcess(pid)).toBeUndefined();
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'drops legacy process records that do not match the current schema',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('legacy-p1');

      const legacyRecord = {
        id: pid,
        key: 'test.agent',
        params: { name: 'agent', target: 'dxn:echo:@:object/feed-abc', notify: null },
        environment: {},
        parentId: null,
        state: Process.State.HYBERNATING,
        alarmDueAt: 42,
        events: [{ seq: 1, _tag: 'spawn' }],
      };

      yield* kv.set('processes', JSON.stringify([pid])).pipe(Effect.orDie);
      yield* kv.set(`process/${pid}/__record`, JSON.stringify(legacyRecord)).pipe(Effect.orDie);

      const store = new ProcessStore(kv);
      expect(yield* store.getProcess(pid)).toBeUndefined();
      expect(yield* store.listProcessIds()).toEqual([]);
      expect(Option.isNone(yield* kv.get(`process/${pid}/__record`).pipe(Effect.orDie))).toBe(true);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );
});
