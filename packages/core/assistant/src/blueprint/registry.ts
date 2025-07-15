//
// Copyright 2025 DXOS.org
//

import { type Blueprint } from './blueprint';

export class BlueprintRegistry {
  constructor(private readonly _blueprints: Blueprint[]) {}

  query() {
    return this._blueprints;
  }
}
