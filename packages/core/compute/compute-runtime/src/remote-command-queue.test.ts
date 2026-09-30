//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';

import * as Process from '@dxos/compute/Process';
import { SpaceId } from '@dxos/keys';

import { RemoteCommandQueue } from './remote-command-queue.ts';

const SPACE = SpaceId.random();
const PID_A = Schema.decodeUnknownSync(Process.ID)('local:a');
const PID_B = Schema.decodeUnknownSync(Process.ID)('local:b');

const spawn = (spaceId = SPACE) =>
  ({
    _tag: 'spawn',
    spaceId,
    key: 'test.echo',
    name: null,
    parentPid: null,
    environment: {},
    annotations: {},
  }) as const;

const input = (pid: Process.ID, value: unknown) => ({ _tag: 'submitInput', spaceId: SPACE, pid, value }) as const;

describe('RemoteCommandQueue', () => {
  it.effect(
    'persists commands across instances, in enqueue order',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const first = new RemoteCommandQueue(kv);
      yield* first.enqueue({ id: 'c1', localPid: PID_A, payload: spawn() });
      yield* first.enqueue({ id: 'c2', localPid: PID_A, payload: input(PID_A, 'hello') });

      // A fresh instance over the same store is what a reload is.
      const second = new RemoteCommandQueue(kv);
      const commands = yield* second.list();
      expect(commands.map((command) => command.id)).toEqual(['c1', 'c2']);
      expect(commands.map((command) => command.payload._tag)).toEqual(['spawn', 'submitInput']);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'enqueueing the same id twice yields the command already queued',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const queue = new RemoteCommandQueue(kv);
      const first = yield* queue.enqueue({ id: 'c1', localPid: PID_A, payload: spawn() });
      const again = yield* queue.enqueue({ id: 'c1', localPid: PID_B, payload: spawn() });
      expect(again.seq).toEqual(first.seq);
      expect(again.localPid).toEqual(PID_A);
      expect((yield* queue.list()).length).toEqual(1);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'completing a command removes it and leaves the rest in order',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const queue = new RemoteCommandQueue(kv);
      yield* queue.enqueue({ id: 'c1', localPid: PID_A, payload: spawn() });
      yield* queue.enqueue({ id: 'c2', localPid: PID_A, payload: input(PID_A, 1) });
      yield* queue.enqueue({ id: 'c3', localPid: PID_A, payload: input(PID_A, 2) });
      yield* queue.complete('c1');
      expect((yield* queue.list()).map((command) => command.id)).toEqual(['c2', 'c3']);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'attempts accumulate per command, which is what the backoff reads',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const queue = new RemoteCommandQueue(kv);
      yield* queue.enqueue({ id: 'c1', localPid: PID_A, payload: spawn() });
      expect(yield* queue.recordAttempt('c1')).toEqual({ attempts: 1 });
      expect(yield* queue.recordAttempt('c1')).toEqual({ attempts: 2 });
      expect((yield* queue.list())[0].attempts).toEqual(2);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'purging a process drops its commands and alias but not another process’s',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const queue = new RemoteCommandQueue(kv);
      yield* queue.enqueue({ id: 'a1', localPid: PID_A, payload: spawn() });
      yield* queue.enqueue({ id: 'a2', localPid: PID_A, payload: input(PID_A, 1) });
      yield* queue.enqueue({ id: 'b1', localPid: PID_B, payload: spawn() });
      yield* queue.setAlias(PID_A, Schema.decodeUnknownSync(Process.ID)('host-a'));
      yield* queue.setAlias(PID_B, Schema.decodeUnknownSync(Process.ID)('host-b'));

      yield* queue.purgeProcess(PID_A);

      expect((yield* queue.list()).map((command) => command.id)).toEqual(['b1']);
      expect(yield* queue.alias(PID_A)).toBeUndefined();
      expect(yield* queue.alias(PID_B)).toEqual('host-b');
    }, Effect.provide(KeyValueStore.layerMemory)),
  );

  it.effect(
    'aliases survive a fresh instance over the same store',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      yield* new RemoteCommandQueue(kv).setAlias(PID_A, Schema.decodeUnknownSync(Process.ID)('host-a'));
      expect(yield* new RemoteCommandQueue(kv).alias(PID_A)).toEqual('host-a');
    }, Effect.provide(KeyValueStore.layerMemory)),
  );
});
