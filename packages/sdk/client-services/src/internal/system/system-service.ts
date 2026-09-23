//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';

import { Event, MulticastObservable } from '@dxos/async';
import { type Config, ConfigService } from '@dxos/config';
import { EffectEx, Hook } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { toServiceError } from '@dxos/protocols';
import { type Platform, SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { SystemService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';
import { type MaybePromise, jsonKeyReplacer } from '@dxos/util';

import * as IdentityContract from '../../contracts/identity.ts';
import * as SpacesContract from '../../contracts/spaces.ts';
import * as Events from '../../Events.ts';
import * as PlatformInfo from '../../PlatformInfo.ts';
import { type Diagnostics, createDiagnosticsFromRouter } from '../diagnostics/index.ts';

export type SystemServiceOptions = {
  config?: () => MaybePromise<Config | undefined>;
  getDiagnostics: () => Promise<Partial<Diagnostics['services']>>;
  /**
   * The embedder's controller, which outlives the stack; a reset is the
   * `Closing → WipingStorage → Reset` chain on it.
   */
  controller: Hook.ControllerService;
};

/**
 * The one client service that exists while the host is closed: it reports and drives the host's
 * status and performs a reset. The host pushes its status in via {@link setStatus}.
 */
export class SystemServiceImpl implements SystemService.Handlers {
  /** A client asked for the host to become this status; the host decides what to do about it. */
  readonly 'statusRequested' = new Event<SystemStatus>();

  readonly #statusChanged = new Event<SystemStatus>();
  readonly #status = MulticastObservable.from(this.#statusChanged, SystemStatus.INACTIVE);
  readonly #options: SystemServiceOptions;
  #resetting = false;
  #resetFiber: Fiber.Fiber<void> | undefined;

  'constructor'(options: SystemServiceOptions) {
    this.#options = options;
  }

  get 'status'(): SystemStatus {
    return this.#status.get();
  }

  /**
   * Reports the host's status to subscribers. Ignored once a reset is under way: that status is
   * final because the app reloads.
   */
  'setStatus'(status: SystemStatus): void {
    if (this.#resetting) {
      return;
    }
    this.#statusChanged.emit(status);
  }

  /**
   * Runs the reset chain: the embedder closes the stack, wipes its storage, and reloads. Reports
   * inactive first so the app falls back at once, and that status is never cleared because the app
   * reloads.
   */
  'reset'(): Effect.Effect<void> {
    const chain = Effect.gen({ self: this }, function* () {
      log.info('resetting...');
      this.#resetting = true;
      this.#statusChanged.emit(SystemStatus.INACTIVE);
      // `Closing` tears the stack down under this very call, and under any request another session
      // has in flight: component finalizers are not re-entrant against live traffic. That holds only
      // because every embedder shuts down or reloads immediately after `Reset` below — a reset that
      // left the worker serving would need a gate that fails new requests from here on.
      yield* Hook.emit(Events.Closing, undefined);
      yield* Hook.emit(Events.WipingStorage, undefined);
      log.info('reset');
      yield* Hook.emit(Events.Reset, undefined);
    }).pipe(Effect.provideService(Hook.Controller, this.#options.controller));

    // Detached from the request fiber: `Closing` above closes the RPC route this very call is
    // served on, which would interrupt the chain before it ever wipes storage. Joining keeps the
    // caller's timing — the join is interrupted, the chain is not.
    //
    // Single-flight over that fiber, because the RPC server dispatches concurrently and a detached
    // chain no longer dies with its caller: a second `reset` would otherwise emit the whole
    // `Closing`/`WipingStorage`/`Reset` sequence again, against a stack the first one already tore
    // down. The fork and the assignment share one synchronous step, so no caller observes the gap.
    return Effect.gen({ self: this }, function* () {
      this.#resetFiber ??= yield* Effect.forkDetach(chain);
      yield* Fiber.join(this.#resetFiber);
    });
  }

  ['SystemService.getConfig'](): Effect.Effect<ConfigProto, BaseError> {
    return Effect.tryPromise({
      try: async () => (await this.#options.config?.())?.values ?? create(ConfigSchema, {}),
      catch: toServiceError,
    });
  }

  /**
   * NOTE: Since this is serialized as a JSON object, we allow the option to serialize keys.
   */
  ['SystemService.getDiagnostics']({ keys }: SystemService.GetDiagnosticsRequest = {}): Effect.Effect<
    SystemService.GetDiagnosticsResponse,
    Error
  > {
    return Effect.tryPromise({
      try: async () => {
        const diagnostics = await this.#options.getDiagnostics();
        return {
          timestamp: new Date(),
          diagnostics: JSON.parse(
            JSON.stringify(
              diagnostics,
              jsonKeyReplacer({
                truncate: keys === SystemService.KeyOption.enums.TRUNCATE,
                humanize: keys === SystemService.KeyOption.enums.HUMANIZE,
              }),
            ),
          ),
        };
      },
      catch: toServiceError,
    });
  }

  ['SystemService.getPlatform'](): Effect.Effect<Platform, BaseError> {
    return Effect.tryPromise({
      try: async () => PlatformInfo.getPlatform(),
      catch: toServiceError,
    });
  }

  ['SystemService.updateStatus']({ status }: SystemService.UpdateStatusRequest): Effect.Effect<void, BaseError> {
    return Effect.sync(() => this.statusRequested.emit(status));
  }

  // TODO(burdon): Standardize interval option in stream request?
  ['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatusRequest = {}): EffectStream.Stream<
    SystemService.QueryStatusResponse,
    Error
  > {
    return EffectEx.streamFromEmitter<SystemService.QueryStatusResponse, Error>((emit) => {
      const subscription = this.#status.subscribe((status) => void emit.single({ status }));
      // Clients treat a silent stream as a dead worker, so the current status is repeated.
      const heartbeat = setInterval(() => void emit.single({ status: this.#status.get() }), interval);
      return Effect.sync(() => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
      });
    });
  }

  ['SystemService.reset'](): Effect.Effect<void, BaseError> {
    return this.reset();
  }
}

/**
 * Serves the {@link SystemService} over the stack's domain handlers: active once the stack has
 * opened, inactive when the layer is torn down, and resetting over the embedder's controller.
 */
export const SystemServiceLayer: Layer.Layer<
  SystemService.Tag,
  never,
  | RpcRouter.RpcRouter
  | ConfigService
  | Hook.Controller
  | IdentityContract.ManagerService
  | SpacesContract.ManagerService
  | SwarmNetworkManagerService
> = Layer.effect(
  SystemService.Tag,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const controller = yield* Hook.Controller;
    const router = yield* RpcRouter.RpcRouter;
    const stack = yield* Effect.context<
      IdentityContract.ManagerService | SpacesContract.ManagerService | SwarmNetworkManagerService
    >();
    const service = new SystemServiceImpl({
      config: () => config,
      getDiagnostics: () => createDiagnosticsFromRouter(router, stack, config),
      controller,
    });
    yield* Hook.on(Events.StackOpened, () => Effect.sync(() => service.setStatus(SystemStatus.ACTIVE)));
    yield* Effect.addFinalizer(() => Effect.sync(() => service.setStatus(SystemStatus.INACTIVE)));
    return service;
  }),
);
