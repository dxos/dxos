//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as Stream from 'effect/Stream';

import type * as Operation from '@dxos/compute/Operation';
import type * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import type { SerializedError } from '@dxos/protocols';

/**
 * Builds a {@link Process.Process} from its {@link Process.Data}. Live members resolve `live` on first use and
 * delegate to it; without `live` they throw, which is what a process known only from data (a test
 * fixture) should do.
 */
export const makeProcessSnapshot = <I = any, O = any, Rpcs extends Rpc.Any = any>(
  data: Process.Data,
  live?: () => Process.Process<I, O, Rpcs>,
): Process.Process<I, O, Rpcs> => new Snapshot<I, O, Rpcs>(data, live);

// Data fields are own enumerable properties, so spreading or serializing a snapshot yields its `Data`;
// the resolver sits in a private field for the same reason.
class Snapshot<I, O, Rpcs extends Rpc.Any> implements Process.Process<I, O, Rpcs> {
  readonly pid: Process.ID;
  readonly parentPid: Process.ID | null;
  readonly key: string;
  readonly params: Process.Params;
  readonly environment: Process.Environment;
  readonly state: Process.State;
  readonly error: SerializedError | null;
  readonly startedAt: number;
  readonly completedAt: Option.Option<number>;
  readonly metrics: Process.Data['metrics'];
  readonly #resolve: (() => Process.Process<I, O, Rpcs>) | undefined;
  #live: Process.Process<I, O, Rpcs> | undefined;

  constructor(data: Process.Data, resolve: (() => Process.Process<I, O, Rpcs>) | undefined) {
    this.pid = data.pid;
    this.parentPid = data.parentPid;
    this.key = data.key;
    this.params = data.params;
    this.environment = data.environment;
    this.state = data.state;
    this.error = data.error;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.metrics = data.metrics;
    this.#resolve = resolve;
  }

  get #process(): Process.Process<I, O, Rpcs> {
    if (this.#live === undefined) {
      if (this.#resolve === undefined) {
        throw new Error(`Process ${this.pid} is known only from data and has no live runtime.`);
      }
      this.#live = this.#resolve();
    }
    return this.#live;
  }

  get status(): Process.Status {
    return this.#process.status;
  }

  get statusAtom(): Atom.Atom<Process.Status> {
    return this.#process.statusAtom;
  }

  get alarmDueAt(): number | null {
    return this.#process.alarmDueAt;
  }

  get rpc(): RpcClient.RpcClient<Rpcs> {
    return this.#process.rpc;
  }

  submitInput(input: I): Effect.Effect<void> {
    return Effect.suspend(() => this.#process.submitInput(input));
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.suspend(() => this.#process.subscribeOutputs());
  }

  subscribeEphemeral(): Stream.Stream<Trace.Message> {
    return Stream.suspend(() => this.#process.subscribeEphemeral());
  }

  terminate(): Effect.Effect<void> {
    return Effect.suspend(() => this.#process.terminate());
  }

  runToCompletion(): Effect.Effect<void> {
    return Effect.suspend(() => this.#process.runToCompletion());
  }

  runUntilSettled(): Effect.Effect<void> {
    return Effect.suspend(() => this.#process.runUntilSettled());
  }

  runAndExit(options: { readonly inputs: readonly I[] }): Stream.Stream<O> {
    return Stream.suspend(() => this.#process.runAndExit(options));
  }

  hydrate(definition: Operation.Durable<I, O, any, any>): Effect.Effect<Process.Process<I, O, Rpcs>> {
    return Effect.suspend(() => this.#process.hydrate(definition));
  }
}
