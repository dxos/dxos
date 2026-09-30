//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';
import type * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';

import * as Process from '@dxos/compute/Process';
import { Annotation } from '@dxos/echo';

/**
 * What a queued command asks the host to do. Space-scoped like every {@link RemoteProcessManager}
 * verb, and addressed by the LOCAL pid — the client mints one at enqueue time so an input or a
 * terminate can name a process the host has not acknowledged yet.
 */
export const CommandPayload = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal('spawn'),
    spaceId: Schema.String,
    key: Schema.String,
    name: Schema.NullOr(Schema.String),
    parentPid: Schema.NullOr(Process.ID),
    environment: Schema.Struct({
      space: Schema.optional(Schema.String),
      conversation: Schema.optional(Schema.String),
    }),
    // Pre-encoded (JSON-safe) by `makeControlVerbs`; persisted verbatim.
    annotations: Annotation.Dictionary,
  }),
  Schema.Struct({
    _tag: Schema.Literal('submitInput'),
    spaceId: Schema.String,
    pid: Process.ID,
    // Already encoded via the process definition's input schema.
    value: Schema.Unknown,
  }),
  Schema.Struct({
    _tag: Schema.Literal('terminate'),
    spaceId: Schema.String,
    pid: Process.ID,
  }),
]);
export type CommandPayload = Schema.Schema.Type<typeof CommandPayload>;

export const Command = Schema.Struct({
  /**
   * Idempotency key, sent with the command and stable across every retry: the host applies a command
   * it has already seen at most once, so a delivery whose acknowledgement was lost is safe to repeat.
   */
  id: Schema.String,
  /** Monotonic within the queue; commands are delivered in this order. */
  seq: Schema.Number,
  /** Client-minted pid of the process this command addresses; aliased to the host's pid after spawn. */
  localPid: Process.ID,
  /** Delivery attempts made so far — what the retry backoff is computed from. */
  attempts: Schema.Number,
  payload: CommandPayload,
});
export type Command = Schema.Schema.Type<typeof Command>;

const QueueSchema = Schema.fromJsonString(Schema.Array(Command));
const AliasSchema = Schema.fromJsonString(Schema.Record(Schema.String, Process.ID));

/**
 * Durable, ordered log of commands addressed to a remote runtime, over the same
 * {@link KeyValueStore.KeyValueStore} the process registry is persisted in (SQLite in the worker).
 *
 * The queue is the client's write-ahead log: a command is durable BEFORE it is pushed, so a reload
 * mid-flight replays it rather than losing it, and every entry carries an idempotency key so a replay
 * the host has already applied is a no-op there.
 *
 * Read-modify-write is serialized through one semaphore: the log is a single record, so concurrent
 * enqueues would otherwise lose each other's entries.
 */
export class RemoteCommandQueue {
  readonly #kv: KeyValueStore.KeyValueStore;
  readonly #prefix: string;
  readonly #lock = Effect.runSync(Semaphore.make(1));

  constructor(kv: KeyValueStore.KeyValueStore, prefix = 'remote-commands/') {
    this.#kv = kv;
    this.#prefix = prefix;
  }

  get #queueKey(): string {
    return `${this.#prefix}queue`;
  }

  get #aliasKey(): string {
    return `${this.#prefix}aliases`;
  }

  /** Every pending command, in delivery order. */
  list(): Effect.Effect<readonly Command[]> {
    return Effect.gen({ self: this }, function* () {
      const raw = yield* this.#kv.get(this.#queueKey).pipe(Effect.orDie);
      if (raw === undefined) {
        return [];
      }
      // A record that will not decode is NOT reported as an empty queue: every mutation below reads
      // the queue and writes it back whole, so answering `[]` here would let the next enqueue or
      // completion overwrite durable commands that are merely unreadable. Failing loudly keeps them
      // on disk for a version of this code that can read them.
      const decoded = yield* Schema.decodeEffect(QueueSchema)(raw).pipe(Effect.orDie);
      return [...decoded].sort((a, b) => a.seq - b.seq);
    });
  }

  /**
   * Appends a command, or returns the pending one carrying the same `id` — the enqueue side of
   * idempotency, which is what makes a spawn retried by a caller resolve to the process already
   * queued rather than a second one.
   */
  enqueue(command: Omit<Command, 'seq' | 'attempts'>): Effect.Effect<Command> {
    return this.#modify((commands) => {
      const existing = commands.find((entry) => entry.id === command.id);
      if (existing) {
        return [commands, existing];
      }
      const seq = commands.reduce((max, entry) => Math.max(max, entry.seq), 0) + 1;
      const entry: Command = { ...command, seq, attempts: 0 };
      return [[...commands, entry], entry];
    });
  }

  /** Removes a delivered command. */
  complete(id: string): Effect.Effect<void> {
    return this.#modify((commands) => [commands.filter((entry) => entry.id !== id), undefined]).pipe(Effect.asVoid);
  }

  /** Records a failed delivery and returns the attempt count, which the backoff is a function of. */
  recordAttempt(id: string): Effect.Effect<{ attempts: number }> {
    return this.#modify((commands) => {
      const next = commands.map((entry) => (entry.id === id ? { ...entry, attempts: entry.attempts + 1 } : entry));
      return [next, { attempts: next.find((command) => command.id === id)?.attempts ?? 0 }];
    });
  }

  /**
   * Drops every command addressed to a process, and its pid alias.
   *
   * Called when the process reaches a terminal state: an input or a terminate for a process that no
   * longer exists can never be applied, so retrying it forever would wedge the queue behind it.
   */
  purgeProcess(localPid: Process.ID): Effect.Effect<void> {
    return this.#modify((commands) => [commands.filter((entry) => entry.localPid !== localPid), undefined]).pipe(
      Effect.andThen(
        this.#modifyAliases((aliases) => {
          const { [localPid]: _dropped, ...rest } = aliases;
          return rest;
        }),
      ),
    );
  }

  /** The host's pid for a client-minted one, once its spawn has been acknowledged. */
  alias(localPid: Process.ID): Effect.Effect<Process.ID | undefined> {
    return this.aliases().pipe(Effect.map((aliases) => aliases[localPid]));
  }

  aliases(): Effect.Effect<Record<string, Process.ID>> {
    return Effect.gen({ self: this }, function* () {
      const raw = yield* this.#kv.get(this.#aliasKey).pipe(Effect.orDie);
      if (raw === undefined) {
        return {};
      }
      const decoded = yield* Schema.decodeEffect(AliasSchema)(raw).pipe(Effect.result);
      return decoded._tag === 'Failure' ? {} : { ...decoded.success };
    });
  }

  setAlias(localPid: Process.ID, remotePid: Process.ID): Effect.Effect<void> {
    return this.#modifyAliases((aliases) => ({ ...aliases, [localPid]: remotePid }));
  }

  #modify<A>(fn: (commands: readonly Command[]) => readonly [readonly Command[], A]): Effect.Effect<A> {
    return this.#lock.withPermits(1)(
      Effect.gen({ self: this }, function* () {
        const commands = yield* this.list();
        const [next, result] = fn(commands);
        const encoded = yield* Schema.encodeEffect(QueueSchema)(next).pipe(Effect.orDie);
        yield* this.#kv.set(this.#queueKey, encoded).pipe(Effect.orDie);
        return result;
      }),
    );
  }

  #modifyAliases(fn: (aliases: Record<string, Process.ID>) => Record<string, Process.ID>): Effect.Effect<void> {
    return this.#lock.withPermits(1)(
      Effect.gen({ self: this }, function* () {
        const aliases = yield* this.aliases();
        const encoded = yield* Schema.encodeEffect(AliasSchema)(fn(aliases)).pipe(Effect.orDie);
        yield* this.#kv.set(this.#aliasKey, encoded).pipe(Effect.orDie);
      }),
    );
  }
}
