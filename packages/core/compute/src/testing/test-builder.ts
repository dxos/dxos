//
// Copyright 2024 DXOS.org
//

import { Client, type ClientOptions } from '@dxos/client';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { type ComputeGraphOptions, ComputeGraphRegistry } from '../compute-graph-registry';

export type TestBuilderOptions = ClientOptions & Partial<ComputeGraphOptions>;

// TODO(burdon): Reconcile with @dxos/client/testing.
export class TestBuilder extends Resource {
  private _client?: Client;
  private _registry?: ComputeGraphRegistry;

  constructor(private readonly _options: TestBuilderOptions = {}) {
    super();
  }

  get ctx(): Context {
    return this._ctx;
  }

  get client(): Client {
    invariant(this._client);
    return this._client;
  }

  get registry(): ComputeGraphRegistry {
    invariant(this._registry);
    return this._registry;
  }

  override async _open(): Promise<void> {
    const client = new Client(this._options);
    await client.initialize();
    await client.halo.createIdentity();
    this._client = client;
    this._ctx.onDispose(async () => {
      await client.destroy();
      this._client = undefined;
    });

    const registry = new ComputeGraphRegistry({
      ...this._options,
      // Provide a default runtime provider for tests if not supplied.
      computeRuntime: this._options.computeRuntime ?? createMockedComputeRuntimeProvider(),
    });
    await registry.open();
    this._registry = registry;
    this._ctx.onDispose(async () => {
      await registry.close();
      this._registry = undefined;
    });
  }
}
