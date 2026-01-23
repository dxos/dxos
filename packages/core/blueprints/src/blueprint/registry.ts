//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

import { type Blueprint } from './blueprint';

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
}
