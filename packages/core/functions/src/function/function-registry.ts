//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, type Space } from '@dxos/client/echo';
import { type Context, Resource } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { FunctionDef, type FunctionManifest } from '../types';
import { diff } from '../util';

export type FunctionsRegisteredEvent = {
  space: Space;
  added: FunctionDef[];
};

export class FunctionRegistry extends Resource {
  private readonly _functionBySpaceKey = new ComplexMap<PublicKey, FunctionDef[]>(PublicKey.hash);

  public readonly registered = new Event<FunctionsRegisteredEvent>();

  constructor(private readonly _client: Client) {
    super();
  }

  public getFunctions(space: Space): FunctionDef[] {
    return this._functionBySpaceKey.get(space.key) ?? [];
  }

  /**
   * Loads function definitions from the manifest into the space.
   * We first load all the definitions from the space to deduplicate by functionId.
   */
  public async register(space: Space, functions: FunctionManifest['functions']): Promise<void> {
    log('register', { space: space.key, functions: functions?.length ?? 0 });
    if (!functions?.length) {
      return;
    }
    if (!space.db.graph.runtimeSchemaRegistry.hasSchema(FunctionDef)) {
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionDef);
    }

    // Sync definitions.
    const { objects: existing } = await space.db.query(Filter.schema(FunctionDef)).run();
    const { added, removed } = diff(existing, functions, (a, b) => a.uri === b.uri);
    added.forEach((def) => space.db.add(create(FunctionDef, def)));
    // TODO(burdon): Update existing templates.
    removed.forEach((def) => space.db.remove(def));
  }

  protected override async _open(): Promise<void> {
    const spacesSubscription = this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        if (this._functionBySpaceKey.has(space.key)) {
          continue;
        }

        const registered: FunctionDef[] = [];
        this._functionBySpaceKey.set(space.key, registered);
        await space.waitUntilReady();
        if (this._ctx.disposed) {
          break;
        }

        // Subscribe to updates.
        this._ctx.onDispose(
          space.db.query(Filter.schema(FunctionDef)).subscribe(({ objects }) => {
            const { added } = diff(registered, objects, (a, b) => a.uri === b.uri);
            // TODO(burdon): Update and remove.
            if (added.length > 0) {
              registered.push(...added);
              this.registered.emit({ space, added });
            }
          }),
        );
      }
    });

    // TODO(burdon): API: Normalize unsubscribe methods.
    this._ctx.onDispose(() => spacesSubscription.unsubscribe());
  }

  protected override async _close(_: Context): Promise<void> {
    this._functionBySpaceKey.clear();
  }
}
