//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, type Space } from '@dxos/client/echo';
import { type Context, Resource } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { FunctionDef, type FunctionManifest } from '../types';

export type FunctionsRegisteredEvent = {
  space: Space;
  newFunctions: FunctionDef[];
};

export class FunctionRegistry extends Resource {
  private _functionBySpaceKey = new ComplexMap<PublicKey, FunctionDef[]>(PublicKey.hash);

  public onFunctionsRegistered = new Event<FunctionsRegisteredEvent>();

  constructor(private readonly _client: Client) {
    super();
  }

  public getFunctions(space: Space): FunctionDef[] {
    return this._functionBySpaceKey.get(space.key) ?? [];
  }

  public async register(space: Space, manifest: FunctionManifest): Promise<void> {
    if (!manifest.functions?.length) {
      return;
    }
    if (!space.db.graph.runtimeSchemaRegistry.isSchemaRegistered(FunctionDef)) {
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionDef);
    }
    const { objects: existingDefinitions } = await space.db.query(Filter.schema(FunctionDef)).run();
    const newDefinitions = getNewDefinitions(manifest.functions, existingDefinitions);
    const reactiveObjects = newDefinitions.map((template) => create(FunctionDef, { ...template }));
    reactiveObjects.forEach((obj) => space.db.add(obj));
  }

  protected override async _open(ctx: Context): Promise<void> {
    const spaceListSubscription = this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        if (this._functionBySpaceKey.has(space.key)) {
          continue;
        }
        await space.waitUntilReady();
        if (ctx.disposed) {
          break;
        }
        const registered: FunctionDef[] = [];
        this._functionBySpaceKey.set(space.key, registered);
        const functionsSubscription = space.db.query(Filter.schema(FunctionDef)).subscribe((definitions) => {
          const newFunctions = getNewDefinitions(definitions.objects, registered);
          if (newFunctions.length > 0) {
            registered.push(...newFunctions);
            this.onFunctionsRegistered.emit({ space, newFunctions });
          }
        });
        ctx.onDispose(functionsSubscription);
      }
    });
    ctx.onDispose(() => spaceListSubscription.unsubscribe());
  }

  protected override async _close(_: Context): Promise<void> {
    this._functionBySpaceKey.clear();
  }
}

const getNewDefinitions = <T extends { functionId: string }>(candidateList: T[], existing: FunctionDef[]): T[] => {
  return candidateList.filter((candidate) => existing.find((def) => def.functionId === candidate.functionId) == null);
};
