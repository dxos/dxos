//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Event, MulticastObservable } from '@dxos/async';
import { type Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { type Platform, SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { SystemService } from '@dxos/protocols/rpc';
import { type MaybePromise, jsonKeyReplacer } from '@dxos/util';

import { type Diagnostics } from '../diagnostics/index.ts';
import { getPlatform } from '../services/platform.ts';

export type SystemServiceOptions = {
  config?: () => MaybePromise<Config | undefined>;
  getDiagnostics: () => Promise<Partial<Diagnostics['services']>>;
  /** Closes the host if it is open; the first step of a reset. */
  close: () => Promise<void>;
  /** Wipes persisted storage so the next open starts fresh; the second step of a reset. */
  wipeStorage: () => Promise<void>;
  /** Runs once storage is wiped; the embedder typically reloads. */
  onReset?: () => MaybePromise<void>;
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
   * Closes the host, wipes its storage, and tells the embedder. Reports inactive first so the app
   * falls back at once, and that status is never cleared because the app reloads.
   */
  async 'reset'(): Promise<void> {
    log.info('resetting...');
    this.#resetting = true;
    this.#statusChanged.emit(SystemStatus.INACTIVE);
    await this.#options.close();
    await this.#options.wipeStorage();
    log.info('reset');
    await this.#options.onReset?.();
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
    return Effect.tryPromise({
      try: () => this.reset(),
      catch: (error) => error as Error,
    });
  }
}
