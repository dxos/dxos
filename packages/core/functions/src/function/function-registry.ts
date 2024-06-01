//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, type Space } from '@dxos/client/echo';
import { type Context, Resource } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, diff } from '@dxos/util';

import { FunctionDef, type FunctionManifest } from '../types';

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

  public getUniqueByUri(): FunctionDef[] {
    const uniqueByUri = [...this._functionBySpaceKey.values()]
      .flatMap((defs) => defs)
      .reduce((acc, v) => {
        acc.set(v.uri, v);
        return acc;
      }, new Map<string, FunctionDef>());
    return [...uniqueByUri.values()];
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
    const { added } = diff(existing, functions, (a, b) => a.uri === b.uri);
    // TODO(burdon): Update existing templates.
    added.forEach((def) => space.db.add(create(FunctionDef, def)));
  }

  protected override async _open(): Promise<void> {
    log.info('opening...');
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
    log.info('closing...');
    this._functionBySpaceKey.clear();
  }
}
