//
// Copyright 2025 DXOS.org
//

export class ResourceClosedError extends Error {
  constructor() {
    super('Resource closed');
  }
}
