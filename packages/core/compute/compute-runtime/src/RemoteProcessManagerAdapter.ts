//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Rpc from 'effect/unstable/rpc/Rpc';

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { log } from '@dxos/log';
import type { ProcessProtocol } from '@dxos/protocols';

import { ProcessManagerService } from './process-manager-service';
import type * as ProcessManager from './ProcessManager';
import { toInfo } from './remote-process-info';
import * as RemoteProcessHandle from './RemoteProcessHandle';
import type * as RemoteProcessManager from './RemoteProcessManager';

/**
 * Presents a remote runtime's {@link RemoteProcessManager.Control} surface as a local
 * {@link ProcessManager.Manager}.
 *
 * This is what lets code written against the in-process manager run against EDGE unchanged — most
 * importantly `AgentService.layer` in `@dxos/agent-runtime`, which spawns and drives `AgentProcess`
 * purely through this interface. Transport-agnostic: it needs only a `Control`, whose EDGE
 * implementation lives in `@dxos/edge-compute`.
 *
 * A remote host cannot be handed a process definition, so {@link spawn} sends the definition's `key`
 * and the host resolves it against the processes it hosts; a key the host does not know fails the
 * spawn.
 */
export class RemoteProcessManagerAdapter implements ProcessManager.Manager {
  readonly #control: RemoteProcessManager.Control;
  readonly #registry: Registry.AtomRegistry;
  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;

  constructor(control: RemoteProcessManager.Control, registry: Registry.AtomRegistry) {
    this.#control = control;
    this.#registry = registry;
    this.#processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    this.#registry.mount(this.#processTreeAtom);
    this.#monitor = {
      processTree: this.#refreshProcessTree,
      processTreeAtom: this.#processTreeAtom,
      // Per-process ephemeral trace is served by `Handle.subscribeEphemeral`; a manager-wide stream
      // needs a push transport the cursor protocol does not provide (see DESIGN D7).
      subscribeToTraceMessages: (_filter: Trace.Filter): Stream.Stream<Trace.Message> => Stream.empty,
    };
  }

  get operationHandlerSet(): OperationHandlerSet.OperationHandlerSet {
    // Operations invoked by a remote process are resolved by the remote runtime's own handler set;
    // the client contributes none.
    return OperationHandlerSet.empty;
  }

  get monitor(): Process.Monitor {
    return this.#monitor;
  }

  spawn<I, O, Rpcs extends Rpc.Any = never>(
    definition: Process.Process<I, O, any, Rpcs>,
    options?: ProcessManager.SpawnOptions,
  ): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const annotations = Annotation.buildDictionary((dictionary) => {
        if (options?.target !== undefined) {
          Annotation.setDictionary(dictionary, Process.TargetAnnotation, options.target);
        }
        if (options?.notify !== undefined) {
          Annotation.setDictionary(dictionary, Process.NotifyAnnotation, options.notify);
        }
        Object.assign(dictionary, options?.annotations ?? {});
      });
      // The dictionary's values are `unknown`, but they cross the wire through `JSON.stringify`, so a
      // value that is not JSON-representable would be dropped or mangled silently. Reject it here,
      // where the caller's stack still says which annotation it was.
      assertJsonSafe(annotations);

      const info = yield* this.#control.spawn({
        key: definition.key,
        ...(options?.name !== undefined ? { name: options.name } : {}),
        ...(options?.parentProcessId !== undefined ? { parentPid: options.parentProcessId } : {}),
        ...(options?.environment !== undefined ? { environment: options.environment } : {}),
        annotations,
      });
      log('remote process spawned', { pid: info.pid, key: info.key });
      return yield* this.#makeHandle<I, O, Rpcs>(info, definition);
    });
  }

  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    // No definition is available by id alone, so the returned handle is a metadata view until the
    // caller re-attaches it to one via `Handle.hydrate`'s local counterpart (`spawn`'s definition).
    return this.#control.status(id).pipe(Effect.flatMap((info) => this.#makeHandle<I, O, Rpcs>(info)));
  }

  list(options?: ProcessManager.ListOptions): Effect.Effect<readonly ProcessManager.Handle.Any[]> {
    return this.#control
      .list({
        ...(options?.key !== undefined ? { key: options.key } : {}),
        ...(options?.target !== undefined ? { target: options.target } : {}),
        ...(options?.state !== undefined ? { state: options.state } : {}),
      })
      .pipe(
        Effect.flatMap((processes) =>
          Effect.forEach(
            processes.filter(
              // `parentProcessId` has no server-side filter (the host indexes by key/target/state),
              // so it is applied here rather than silently ignored.
              (info) => options?.parentProcessId === undefined || info.parentPid === options.parentProcessId,
            ),
            (info) => this.#makeHandle(info),
          ),
        ),
      );
  }

  runAllProcessesToCompletion(): Effect.Effect<void> {
    return this.list().pipe(
      Effect.flatMap((handles) => Effect.forEach(handles, (handle) => handle.runToCompletion(), { discard: true })),
    );
  }

  shutdown(): Effect.Effect<void> {
    // The remote host owns process lifecycle across client restarts — that is the point of hosting
    // them there — so a client teardown suspends nothing.
    return Effect.void;
  }

  startup(): Effect.Effect<void> {
    return Effect.void;
  }

  #makeHandle<I, O, Rpcs extends Rpc.Any>(
    info: ProcessProtocol.ProcessInfo,
    definition?: Process.Process<I, O, any, Rpcs>,
  ): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    return RemoteProcessHandle.RemoteProcessHandle.make<I, O, Rpcs>({
      info,
      control: this.#control,
      ...(definition !== undefined ? { definition } : {}),
      registry: this.#registry,
    });
  }

  get #refreshProcessTree(): Effect.Effect<readonly Process.Info[]> {
    return this.#control.list().pipe(
      Effect.map((processes) => processes.map(toInfo)),
      Effect.tap((tree) => Effect.sync(() => this.#registry.update(this.#processTreeAtom, () => tree))),
    );
  }
}

/**
 * Provides {@link ProcessManagerService} backed by a remote runtime, so a stack assembled for the
 * in-process manager runs against EDGE by swapping this layer in.
 */
export const layer = (
  control: RemoteProcessManager.Control,
): Layer.Layer<ProcessManagerService, never, Registry.AtomRegistry> =>
  Layer.effect(
    ProcessManagerService,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      return new RemoteProcessManagerAdapter(control, registry);
    }),
  );

/**
 * Fails when a value cannot survive `JSON.stringify` unchanged. Annotation values are typed
 * `unknown`, and the wire protocol requires JSON — a `Date`, a `Map`, a function or a cycle would
 * otherwise reach the host as something else, or not at all.
 */
const assertJsonSafe = (annotations: Annotation.Dictionary): void => {
  for (const [key, value] of Object.entries(annotations)) {
    let encoded: string;
    try {
      encoded = JSON.stringify(value);
    } catch (cause) {
      throw new TypeError(`Process annotation '${key}' is not JSON-serializable`, { cause });
    }
    if (encoded === undefined) {
      throw new TypeError(`Process annotation '${key}' has no JSON representation`);
    }
    if (JSON.stringify(JSON.parse(encoded)) !== encoded || !isJsonEquivalent(value, JSON.parse(encoded))) {
      throw new TypeError(`Process annotation '${key}' does not survive JSON encoding unchanged`);
    }
  }
};

/** Structural equality against a value's own JSON round trip, so a lossy encoding is caught. */
const isJsonEquivalent = (value: unknown, roundTripped: unknown): boolean =>
  JSON.stringify(value) === JSON.stringify(roundTripped);
