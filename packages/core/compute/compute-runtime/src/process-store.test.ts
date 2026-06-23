//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

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
});
