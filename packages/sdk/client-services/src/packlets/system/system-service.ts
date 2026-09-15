//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';

import { Event, MulticastObservable } from '@dxos/async';
import { type Config, ConfigService } from '@dxos/config';
import { Event as EffectEvent, EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { type Platform, SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { SystemService } from '@dxos/protocols/rpc';
import { type MaybePromise, jsonKeyReplacer } from '@dxos/util';

import { type Diagnostics, createDiagnosticsFromHandlers } from '../diagnostics/index.ts';
import { IdentityManagerService } from '../identity/index.ts';
import { Closing, Reset, StackOpened, WipingStorage } from '../services/events.ts';
import { type RpcServicesContext, rpcHandlersFromStack } from '../services/handlers.ts';
import { getPlatform } from '../services/platform.ts';
import { DataSpaceManagerService } from '../spaces/index.ts';

export type SystemServiceOptions = {
  config?: () => MaybePromise<Config | undefined>;
  getDiagnostics: () => Promise<Partial<Diagnostics['services']>>;
  /** The embedder's bus, which outlives the stack; a reset is the `Closing → WipingStorage → Reset` chain on it. */
  bus: EffectEvent.BusService;
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
    return Effect.gen({ self: this }, function* () {
      log.info('resetting...');
      this.#resetting = true;
      this.#statusChanged.emit(SystemStatus.INACTIVE);
      yield* EffectEvent.emit(Closing, undefined);
      yield* EffectEvent.emit(WipingStorage, undefined);
      log.info('reset');
      yield* EffectEvent.emit(Reset, undefined);
    }).pipe(Effect.provideService(EffectEvent.Bus, this.#options.bus));
  }

  ['SystemService.getConfig'](): Effect.Effect<ConfigProto, Error> {
    return Effect.tryPromise({
      try: async () => (await this.#options.config?.())?.values ?? create(ConfigSchema, {}),
      catch: (error) => error as Error,
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
      catch: (error) => error as Error,
    });
  }

  ['SystemService.getPlatform'](): Effect.Effect<Platform, Error> {
    return Effect.tryPromise({
      try: async () => getPlatform(),
      catch: (error) => error as Error,
    });
  }

  ['SystemService.updateStatus']({ status }: SystemService.UpdateStatusRequest): Effect.Effect<void, Error> {
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

  ['SystemService.reset'](): Effect.Effect<void, Error> {
    return this.reset();
  }
}

/**
 * Serves the {@link SystemService} over the stack's domain handlers: active once the stack has
 * opened, inactive when the layer is torn down, and resetting over the embedder's bus.
 */
export const SystemServiceLayer: Layer.Layer<
  SystemService.Tag,
  never,
  | RpcServicesContext
  | ConfigService
  | EffectEvent.Bus
  | IdentityManagerService
  | DataSpaceManagerService
  | SwarmNetworkManagerService
> = Layer.effect(
  SystemService.Tag,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const bus = yield* EffectEvent.Bus;
    const stack = yield* Effect.context<
      RpcServicesContext | IdentityManagerService | DataSpaceManagerService | SwarmNetworkManagerService
    >();
    const service = new SystemServiceImpl({
      config: () => config,
      getDiagnostics: () => createDiagnosticsFromHandlers(() => rpcHandlersFromStack(stack), stack, config),
      bus,
    });
    yield* EffectEvent.on(StackOpened, () => Effect.sync(() => service.setStatus(SystemStatus.ACTIVE)));
    yield* Effect.addFinalizer(() => Effect.sync(() => service.setStatus(SystemStatus.INACTIVE)));
    return service;
  }),
);
