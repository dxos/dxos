//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';

import * as Process from '@dxos/compute/Process';

import { ProcessStore } from './process-store.ts';

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
    'does not duplicate the index entry when putProcess is called twice for the same id',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('p-dup');
      const store = new ProcessStore(kv);

      const record = {
        id: pid,
        key: 'test.waiting',
        params: { name: null, annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      };
      yield* store.putProcess(record);
      yield* store.putProcess(record);
      expect(yield* store.listProcessIds()).toEqual([pid]);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'resumes the sequence counter from the highest persisted event seq on putProcess',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('p-resume-seq');
      const store = new ProcessStore(kv);

      yield* store.putProcess({
        id: pid,
        key: 'test.waiting',
        params: { name: null, annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [
          { seq: 5, _tag: 'spawn' },
          { seq: 3, _tag: 'alarm' },
        ],
      });
      const seq = yield* store.appendEvent(pid, { _tag: 'alarm' });
      expect(seq).toEqual(6);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'assigns strictly increasing sequence numbers and removes only the targeted event',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('p-seq');
      const store = new ProcessStore(kv);

      yield* store.putProcess({
        id: pid,
        key: 'test.waiting',
        params: { name: null, annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      });
      const seq1 = yield* store.appendEvent(pid, { _tag: 'spawn' });
      const seq2 = yield* store.appendEvent(pid, { _tag: 'alarm' });
      const seq3 = yield* store.appendEvent(pid, { _tag: 'alarm' });
      expect([seq1, seq2, seq3]).toEqual([1, 2, 3]);

      yield* store.removeEvent(pid, seq2);
      const record = yield* store.getProcess(pid);
      expect(record?.events).toEqual([
        { seq: seq1, _tag: 'spawn' },
        { seq: seq3, _tag: 'alarm' },
      ]);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'frees per-process seq and index state on delete, so a re-spawned process with the same id restarts its sequence',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid1 = Process.ID.make('p-recycled');
      const pid2 = Process.ID.make('p-other');
      const store = new ProcessStore(kv);

      const base = {
        key: 'test.waiting',
        params: { name: null, annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      };
      yield* store.putProcess({ ...base, id: pid1 });
      yield* store.putProcess({ ...base, id: pid2 });
      yield* store.appendEvent(pid1, { _tag: 'spawn' });
      yield* store.appendEvent(pid1, { _tag: 'alarm' });

      yield* store.deleteProcess(pid1);
      expect(yield* store.listProcessIds()).toEqual([pid2]);

      yield* store.putProcess({ ...base, id: pid1 });
      const seq = yield* store.appendEvent(pid1, { _tag: 'spawn' });
      expect(seq).toEqual(1);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'filters out ids whose record is missing when listing all processes',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid1 = Process.ID.make('p-present');
      const pid2 = Process.ID.make('p-missing');
      const store = new ProcessStore(kv);

      yield* store.putProcess({
        id: pid1,
        key: 'test.waiting',
        params: { name: null, annotations: {} },
        environment: {},
        parentId: null,
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      });
      // Simulates a record whose entry was dropped from the KV without updating the index.
      yield* kv.set('processes', JSON.stringify([pid1, pid2])).pipe(Effect.orDie);

      const records = yield* store.listProcesses();
      expect(records.map((record) => record.id)).toEqual([pid1]);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'no-ops when modifying a process that was never persisted',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const pid = Process.ID.make('p-never-persisted');
      const store = new ProcessStore(kv);

      yield* store.setState(pid, Process.State.RUNNING);
      yield* store.removeEvent(pid, 1);
      expect(yield* store.getProcess(pid)).toBeUndefined();
      expect(yield* store.listProcessIds()).toEqual([]);
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
      expect(yield* kv.get(`process/${pid}/__record`).pipe(Effect.orDie)).toBeUndefined();
    }, Effect.provide(KeyValueStore.layerMemory)),
  );
});
