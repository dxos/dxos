//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import { Blueprint } from './blueprint';

/**
 * Blueprint registry.
 */
export class Registry {
  private readonly _blueprints: Blueprint[] = [];

  constructor(blueprints: Blueprint[]) {
    const seen = new Set<string>();
    blueprints.forEach((blueprint) => {
      if (seen.has(blueprint.key)) {
        log.warn('duplicate blueprint', { key: blueprint.key });
      } else {
        seen.add(blueprint.key);
        this._blueprints.push(blueprint);
      }
    });

    this._blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
  }

  get blueprints(): Blueprint[] {
    return this._blueprints;
  }

  getByKey(key: string): Blueprint | undefined {
    return this._blueprints.find((blueprint) => blueprint.key === key);
  }

  query(): Blueprint[] {
    return this._blueprints;
  }

  updateBlueprints(): Effect.Effect<void, never, Database.Service> {
    return Effect.gen(this, function* () {
      const blueprints = yield* Database.runQuery(Filter.type(Blueprint));
      for (const blueprint of blueprints) {
        const registryBlueprint = this.getByKey(blueprint.key);
        if (!registryBlueprint) {
          continue;
        }
        const source = Obj.clone(registryBlueprint, { deep: true });
        Obj.change(blueprint, (mutable) => {
          void Obj.updateFrom(mutable, source);
        });
      }
    }).pipe(Effect.orDie);
  }
}

export class RegistryService extends Context.Tag('@dxos/blueprints/RegistryService')<RegistryService, Registry>() {}

/**
 * Resolves a blueprint from the registry.
 * Does not check the local database for the blueprint.
 */
export const resolve = (key: string): Effect.Effect<Blueprint, NotFoundError, RegistryService> =>
  Effect.gen(function* () {
    const registry = yield* RegistryService;
    const blueprint = registry.getByKey(key);
    if (!blueprint) {
      return yield* Effect.fail(new NotFoundError({ context: { key } }));
    }
    return blueprint;
  });

/**
 * Upserts a blueprint into the database.
 * If the blueprint already exists in the database, local blueprint is returned.
 * Otherwise, it will be added.
 */
export const upsert = (key: string): Effect.Effect<Blueprint, NotFoundError, RegistryService | Database.Service> =>
  Effect.gen(function* () {
    const local = yield* Database.runQuery(Filter.type(Blueprint, { key }));
    if (local.length > 0) {
      return local[0];
    }
    return yield* Database.add(Obj.clone(yield* resolve(key), { deep: true }));
  });

export class NotFoundError extends BaseError.extend('BlueprintNotFound', 'Blueprint not found') {}
