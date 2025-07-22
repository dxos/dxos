//
// Copyright 2025 DXOS.org
//

import { type Blueprint } from './blueprint';

export class BlueprintRegistry {
  constructor(private readonly _blueprints: Blueprint[]) {
    this._blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
  }

  query(): Blueprint[] {
    return this._blueprints;
  }
}
