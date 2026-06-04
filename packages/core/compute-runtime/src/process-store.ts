//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Process } from '@dxos/compute';

// A child-exit event flattened to a JSON-serializable shape. Exit/Cause are not
// directly serializable; on redelivery we reconstruct Exit.void / Exit.die(message).
// Fidelity is best-effort by design (see plan "Out of scope").
const PersistedChildEvent = Schema.Struct({
  pid: Process.ID,
  exited: Schema.Boolean,
  // For 'exited' events only.
  success: Schema.optional(Schema.Boolean),
  error: Schema.optional(Schema.String),
  // For 'output' events only. JSON value.
  data: Schema.optional(Schema.Unknown),
});

export const PersistedEvent = Schema.Union(
  Schema.Struct({ seq: Schema.Number, _tag: Schema.Literal('spawn') }),
  // `value` is the input encoded via the process definition's input schema.
  Schema.Struct({
    seq: Schema.Number,
    _tag: Schema.Literal('input'),
    value: Schema.Unknown,
  }),
  Schema.Struct({ seq: Schema.Number, _tag: Schema.Literal('alarm') }),
  Schema.Struct({ seq: Schema.Number, _tag: Schema.Literal('childEvent'), event: PersistedChildEvent }),
);
export type PersistedEvent = Schema.Schema.Type<typeof PersistedEvent>;

// Event payload as accepted by ProcessStore.appendEvent (seq assigned internally).
export type PersistedEventInput =
  | Omit<Extract<PersistedEvent, { _tag: 'spawn' }>, 'seq'>
  | Omit<Extract<PersistedEvent, { _tag: 'input' }>, 'seq'>
  | Omit<Extract<PersistedEvent, { _tag: 'alarm' }>, 'seq'>
  | Omit<Extract<PersistedEvent, { _tag: 'childEvent' }>, 'seq'>;

export const PersistedProcess = Schema.Struct({
  id: Process.ID,
  key: Schema.String,
  params: Schema.Struct({
    name: Schema.NullOr(Schema.String),
    target: Schema.NullOr(Schema.String),
    notify: Schema.NullOr(Schema.Unknown),
  }),
  // Environment is { space?: SpaceId, conversation?: URI } — both string-serializable.
  environment: Schema.Struct({
    space: Schema.optional(Schema.String),
    conversation: Schema.optional(Schema.String),
  }),
  parentId: Schema.NullOr(Process.ID),
  state: Schema.Enums(Process.State),
  alarmDueAt: Schema.NullOr(Schema.Number),
  events: Schema.Array(PersistedEvent),
});
export type PersistedProcess = Schema.Schema.Type<typeof PersistedProcess>;

const INDEX_KEY = 'processes';
const recordKey = (id: Process.ID) => `process/${id}/__record`;

const IndexSchema = Schema.parseJson(Schema.Array(Process.ID));
const RecordSchema = Schema.parseJson(PersistedProcess);

/**
 * Durable persistence for the process registry over a KeyValueStore.
 * All read-modify-write operations on a single record are serialized through a
 * per-process semaphore to avoid lost updates to the events array.
 */
export class ProcessStore {
  readonly #kv: KeyValueStore.KeyValueStore;
  readonly #seq = new Map<Process.ID, number>();
  readonly #locks = new Map<Process.ID, Effect.Semaphore>();

  constructor(kv: KeyValueStore.KeyValueStore) {
    this.#kv = kv;
  }

  #lock(id: Process.ID): Effect.Semaphore {
    let lock = this.#locks.get(id);
    if (!lock) {
      lock = Effect.runSync(Effect.makeSemaphore(1));
      this.#locks.set(id, lock);
    }
    return lock;
  }

  /** Returns the IDs of all persisted processes. */
  listProcessIds(): Effect.Effect<readonly Process.ID[]> {
    return Effect.gen(this, function* () {
      const raw = yield* this.#kv.get(INDEX_KEY).pipe(Effect.orDie);
      if (Option.isNone(raw)) {
        return [];
      }
      return yield* Schema.decode(IndexSchema)(raw.value).pipe(Effect.orDie);
    });
  }

  /** Returns the persisted record for the given process ID, or `undefined` if not found. */
  getProcess(id: Process.ID): Effect.Effect<PersistedProcess | undefined> {
    return Effect.gen(this, function* () {
      const raw = yield* this.#kv.get(recordKey(id)).pipe(Effect.orDie);
      if (Option.isNone(raw)) {
        return undefined;
      }
      return yield* Schema.decode(RecordSchema)(raw.value).pipe(Effect.orDie);
    });
  }

  /** Returns all persisted process records. */
  listProcesses(): Effect.Effect<readonly PersistedProcess[]> {
    return Effect.gen(this, function* () {
      const ids = yield* this.listProcessIds();
      const records = yield* Effect.forEach(ids, (id) => this.getProcess(id));
      return records.filter((record): record is PersistedProcess => record !== undefined);
    });
  }

  /** Persists a process record, adding it to the index if it is not already present. */
  putProcess(record: PersistedProcess): Effect.Effect<void> {
    return this.#lock(record.id).withPermits(1)(
      Effect.gen(this, function* () {
        const encoded = yield* Schema.encode(RecordSchema)(record).pipe(Effect.orDie);
        yield* this.#kv.set(recordKey(record.id), encoded).pipe(Effect.orDie);
        const ids = yield* this.listProcessIds();
        if (!ids.includes(record.id)) {
          const nextIndex = yield* Schema.encode(IndexSchema)([...ids, record.id]).pipe(Effect.orDie);
          yield* this.#kv.set(INDEX_KEY, nextIndex).pipe(Effect.orDie);
        }
        this.#seq.set(
          record.id,
          record.events.reduce((max, event) => Math.max(max, event.seq), 0),
        );
      }),
    );
  }

  /** Removes the process record and its index entry, and frees in-memory seq/lock state. */
  deleteProcess(id: Process.ID): Effect.Effect<void> {
    return this.#lock(id).withPermits(1)(
      Effect.gen(this, function* () {
        yield* this.#kv.remove(recordKey(id)).pipe(Effect.orDie);
        const ids = yield* this.listProcessIds();
        const nextIndex = yield* Schema.encode(IndexSchema)(ids.filter((value) => value !== id)).pipe(Effect.orDie);
        yield* this.#kv.set(INDEX_KEY, nextIndex).pipe(Effect.orDie);
        this.#seq.delete(id);
        this.#locks.delete(id);
      }),
    );
  }

  #modify(id: Process.ID, fn: (record: PersistedProcess) => PersistedProcess): Effect.Effect<void> {
    return this.#lock(id).withPermits(1)(
      Effect.gen(this, function* () {
        const record = yield* this.getProcess(id);
        if (!record) {
          return;
        }
        const next = fn(record);
        const encoded = yield* Schema.encode(RecordSchema)(next).pipe(Effect.orDie);
        yield* this.#kv.set(recordKey(id), encoded).pipe(Effect.orDie);
      }),
    );
  }

  /** Updates the lifecycle state of the given process. */
  setState(id: Process.ID, state: Process.State): Effect.Effect<void> {
    return this.#modify(id, (record) => ({ ...record, state }));
  }

  /** Updates the alarm due-time for the given process, or clears it when `null`. */
  setAlarm(id: Process.ID, alarmDueAt: number | null): Effect.Effect<void> {
    return this.#modify(id, (record) => ({ ...record, alarmDueAt }));
  }

  /** Appends an event to the process event journal and returns the assigned sequence number. */
  appendEvent(id: Process.ID, event: PersistedEventInput): Effect.Effect<number> {
    return Effect.gen(this, function* () {
      const seq = (this.#seq.get(id) ?? 0) + 1;
      this.#seq.set(id, seq);
      yield* this.#modify(id, (record) => ({
        ...record,
        // Cast required: TypeScript cannot narrow the spread + added `seq` field to a union member.
        events: [...record.events, { ...event, seq } as PersistedEvent],
      }));
      return seq;
    });
  }

  /** Removes the event with the given sequence number from the process event journal. */
  removeEvent(id: Process.ID, seq: number): Effect.Effect<void> {
    return this.#modify(id, (record) => ({ ...record, events: record.events.filter((event) => event.seq !== seq) }));
  }
}
