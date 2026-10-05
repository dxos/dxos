//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';

import { Resource } from '@dxos/context';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as Client from '@dxos/worker-framework/Client';
import * as Coordinator from '@dxos/worker-framework/Coordinator';

import * as Rpc from '../internal/rpc.ts';
import { MODULE_HOST_LEADER_LOCK_KEY } from './module-host-constants.ts';
import {
  ModuleHostClientRpcs,
  type ModuleHostConfig,
  ModuleHostRpcs,
  type ModuleInfo,
  type ModuleInvokeError,
} from './module-host-service.ts';

type ModuleHostRpc = {
  listModules: (input: Record<string, never>) => Effect.Effect<readonly ModuleInfo[]>;
  invoke: (input: {
    module: string;
    method: string;
    args: readonly unknown[];
  }) => Effect.Effect<unknown, ModuleInvokeError>;
};

/**
 * Tab-side connection to the module-host worker. The module URLs travel in the worker's `init`
 * config, so only the leader tab's list takes effect; a follower joining an existing worker gets
 * whatever that worker loaded.
 */
export class ModuleHostConnection extends Resource {
  readonly #connection: Client.Connection;
  #scope: Scope.Closeable | undefined;
  #rpc: ModuleHostRpc | undefined;

  constructor(config: ModuleHostConfig) {
    super();
    this.#connection = new Client.Connection({
      createWorker: () => new Worker(new URL('./module-host-worker.ts', import.meta.url), { type: 'module' }),
      createCoordinator: () =>
        new Coordinator.SharedWorker({
          createWorker: () =>
            new SharedWorker(new URL('./coordinator-worker.ts', import.meta.url), {
              type: 'module',
              name: 'worker-framework-module-host-coordinator',
            }),
        }),
      leaderLockKey: MODULE_HOST_LEADER_LOCK_KEY,
      config,
      onConnect: async ({ clientToWorker, workerToClient }) => {
        invariant(this.#scope, 'module host rpc scope not initialized');
        const clientServer = Rpc.serve(
          workerToClient,
          ModuleHostClientRpcs,
          ModuleHostClientRpcs.toLayer(Effect.succeed({})),
        );
        await clientServer.open();
        this.#rpc = (await EffectEx.runPromise(
          Rpc.makeClient(clientToWorker, ModuleHostRpcs).pipe(Scope.provide(this.#scope)),
        )) as ModuleHostRpc;
        return {
          close: async () => {
            this.#rpc = undefined;
            await clientServer.close();
          },
        };
      },
    });
  }

  get #client(): ModuleHostRpc {
    invariant(this.#rpc, 'module host rpc not connected');
    return this.#rpc;
  }

  override async _open(): Promise<void> {
    this.#scope = Effect.runSync(Scope.make());
    try {
      await this.#connection.open();
    } catch (error) {
      // `Resource` stays closed after a failed open, so `_close` never runs to release the scope.
      await this.#closeScope();
      throw error;
    }
  }

  override async _close(): Promise<void> {
    await this.#connection.close();
    await this.#closeScope();
    this.#rpc = undefined;
  }

  async #closeScope(): Promise<void> {
    const scope = this.#scope;
    this.#scope = undefined;
    if (scope) {
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
    }
  }

  listModules = async (): Promise<readonly ModuleInfo[]> => EffectEx.runPromise(this.#client.listModules({}));

  invoke = async (module: string, method: string, ...args: unknown[]): Promise<unknown> =>
    EffectEx.runPromise(this.#client.invoke({ module, method, args }));
}
